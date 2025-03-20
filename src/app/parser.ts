import { KleiReader } from './array_reader'
import { Db, Deser, read_types } from './deser'

interface Vec3 {
    x: number
    y: number
    z: number
}

interface Vec4 {
    x: number
    y: number
    z: number
    w: number
}

interface GameObject {
    tag: string
    position: Vec3
    rotation: Vec3
    scale: Vec3
    props: any
}

interface SaveFile {
    header: any
    root: any
    settings: any
    objs: GameObject[]
    game_save_data: any
}

export async function parse_worldgen(data: ArrayBuffer): Promise<Db> {
    let rd = new KleiReader(data)
    const types = read_types(rd)
    const deser = new Deser(rd, types)

    const cluster_layout_save = deser.deser_obj()

    return cluster_layout_save
}

export async function parse(data: ArrayBuffer): Promise<SaveFile> {
    let rd = new KleiReader(data)

    const build_version = rd.i32()
    const header_size = rd.i32()
    const header_version = rd.i32()
    const is_compressed = header_version >= 1? rd.i32(): 0

    const header_str = rd.fixed_len_string(header_size)
    const header = JSON.parse(header_str)

    const types = read_types(rd)

    let content = rd.tail()
    if (is_compressed) {
        const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(content);
              controller.close();
            },
        });

        const inflater = new DecompressionStream('deflate')
        const inflatedReader = stream.pipeThrough(inflater).getReader()

        const inflatedChunks: Uint8Array[] = []
        let inflatedLen: number = 0
        for (;;) {
            const chunk = await inflatedReader.read()
            if (chunk.done)
                break
            inflatedChunks.push(chunk.value)
            inflatedLen += chunk.value.length
        }

        const inflated = new Uint8Array(inflatedLen)

        let offset = 0
        for (const chunk of inflatedChunks) {
            inflated.set(chunk, offset)
            offset += chunk.length
        }

        content = inflated.buffer
    }

    rd = new KleiReader(content)

    // await writeFile('c:/Users/vejna/Documents/Klei/OxygenNotIncluded/cloud_save_files/76561198005222980/2025-03-15/2025-03-15.sav.inflated', content)

    const world = rd.nullable_string()

    const deser = new Deser(rd, types)

    // const objs = []
    // while (pos != content.length) {
    //     const obj = deser_obj()
    //     objs.push(obj)
    // }
    const save_file_root = deser.deser_obj()
    const settings = deser.deser_obj()

    const load_sim = () => {
        const len = rd.i32()
        const packet = rd.bytes(len)
        // send packet to SIM with -672538170
        return packet
    }

    load_sim()

    const load_ksav = () => {
        const sig = rd.bytes(4)
        const maj = rd.i32()
        const min = rd.i32()

        const objs: GameObject[] = []

        const len = rd.i32()
        for (let i = 0; i != len; i++) {
            const tag = rd.string()

            const root_count = rd.i32()
            const size = rd.i32()

            for (let root_idx = 0; root_idx != root_count; ++root_idx) {
                const position = rd.v3f32()
                const rotation = rd.v4f32()
                const scale = rd.v3f32()

                rd.u8()

                const props: Db = {}

                const component_count = rd.i32()
                for (let j = 0; j != component_count; j++) {
                    const component_name = rd.string()
                    const component_size = rd.i32()

                    const cls = types.get(component_name)
                    if (cls === undefined) {
                        rd.skip(component_size)
                    } else {
                        props[component_name] = deser.deser_cls(cls, component_size)
                    }
                }

                objs.push({tag, position, rotation, scale, props})
            }
        }

        return objs
    }

    const objs = load_ksav()

    const game_save_data = deser.deser_obj()

    return {
        header,
        root: save_file_root,
        settings: settings,
        objs,
        game_save_data,
    }
}
