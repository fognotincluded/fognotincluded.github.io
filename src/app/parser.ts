import { KleiReader } from './array_reader'

enum SerializationTypeInfo {
	UserDefined = 0,
	SByte = 1,
	Byte = 2,
	Boolean = 3,
	Int16 = 4,
	UInt16 = 5,
	Int32 = 6,
	UInt32 = 7,
	Int64 = 8,
	UInt64 = 9,
	Single = 10,
	Double = 11,
	String = 12,
	Enumeration = 13,
	Vector2I = 14,
	Vector2 = 15,
	Vector3 = 16,
	Array = 17,
	Pair = 18,
	Dictionary = 19,
	List = 20,
	HashSet = 21,
	Queue = 22,
	Color = 23,
	IS_GENERIC_TYPE = 128,
	IS_VALUE_TYPE = 64,
	VALUE_MASK = 63,
}

type SavType = {
    kind:
        'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32' | 'u64' | 'i64'
        | 'f32' | 'f64'
        | 'bool' | 'str' | 'v2i32' | 'v2f32' | 'v3f32' | 'color'
} | {
    kind: 'enum'
    name: string
} | {
    kind: 'class' | 'struct'
    name: string
    args: SavType[]
} | {
    kind: 'array' | 'list' | 'set' | 'queue'
    base_tp: SavType
} | {
    kind: 'dict'
    key_tp: SavType
    value_tp: SavType
} | {
    kind: 'pair'
    first_tp: SavType
    second_tp: SavType
}

interface SavField {
    name: string
    type: SavType
}

interface SavClass {
    name: string
    fields: SavField[]
    props: SavField[]
}

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

type SavValue = null | boolean | number | string | ArrayBuffer | Set<SavValue> | Db | SavValue[]

export interface Db {
    [key: string]: SavValue
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

// export async function parse_worldgen(data: ArrayBuffer): Promise<SaveFile> {
//     let rd = new KleiReader(data)
//     const types = read_types(rd)
// }

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

    const deser_cls = (cls: SavClass, size?: number) => {
        const next_pos = size? rd.tell() + size: undefined

        const obj: Db = {}
        for (const field of cls.fields) {
            obj[field.name] = deser_tp(field.type)
        }
        for (const prop of cls.props) {
            obj[prop.name] = deser_tp(prop.type)
        }

        if (next_pos !== undefined && rd.tell() < next_pos) {
            obj['.extra'] = next_pos - rd.tell()
            rd.seek(next_pos)
            //obj['.extra'] = rd.bytes(next_pos - pos)
        }

        return obj
    }

    const deser_tp = (tp: SavType, allow_value_types: boolean = false): SavValue => {
        switch (tp.kind) {
            case 'bool':
                return rd.u8() == 1

            case 'enum':
            case "i32":
                return rd.i32()

            case "u32":
                return rd.u32()

            case "f32":
                return rd.f32()

            case "v2i32":
                return rd.v2i32()
            case "v2f32":
                return rd.v2f32()
            case "v3f32":
                return rd.v3f32()

            case 'str': {
                return rd.nullable_string()
            }

            case 'dict': {
                const size = rd.i32()
                const len = rd.i32()

                if (len < 0)
                    return null

                const values = []

                const r: Db = {}

                for (let i = 0; i != len; i++) {
                    values.push(deser_tp(tp.value_tp))
                }
                for (let i = 0; i != len; i++) {
                    const key = deser_tp(tp.key_tp)
                    if (typeof key === 'string')
                        r[key] = values[i]
                }

                return r
            }

            case 'set': {
                const size = rd.i32()
                const len = rd.i32()

                if (len < 0) {
                    return null
                }

                const r = new Set<any>()
                for (let i = 0; i != len; i++) {
                    r.add(deser_tp(tp.base_tp, true))
                }
                return r
            }

            case 'list':
            case 'array': {
                const size = rd.i32()
                const len = rd.i32()

                if (len < 0) {
                    return null
                }

                switch (tp.base_tp.kind) {
                    case 'u8': {
                        return rd.bytes(len)
                    }
                    default: {
                        const r = []
                        for (let i = 0; i != len; i++) {
                            r.push(deser_tp(tp.base_tp, true))
                        }
                        return r
                    }
                }
            }

            case 'class': {
                const size = rd.i32()

                if (size < 0)
                    return null

                const cls = types.get(tp.name)
                if (cls === undefined) {
                    rd.skip(size)
                    return null // XXX
                }

                return deser_cls(cls, size)
            }

            case 'struct': {
                let size
                if (!allow_value_types) {
                    size = rd.i32()
                }

                const cls = types.get(tp.name)
                if (cls === undefined) {
                    if (size === undefined)
                        throw "XXX"
                    rd.skip(size)
                    return null // XXX
                }

                return deser_cls(cls, size)
            }

            case 'pair': {
                const size = rd.i32()
                const first = deser_tp(tp.first_tp)
                const second = deser_tp(tp.second_tp)
                return [first, second]
            }

            default: {
                throw "XXX"
            }
        }
    }

    const deser_obj = (): Db => {
        const tp_name = rd.string()
        const cls = types.get(tp_name)
        if (!cls)
            throw "XXX"

        return deser_cls(cls)
    }

    // const objs = []
    // while (pos != content.length) {
    //     const obj = deser_obj()
    //     objs.push(obj)
    // }
    const save_file_root = deser_obj()
    const settings = deser_obj()

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
                        props[component_name] = deser_cls(cls, component_size)
                    }
                }

                objs.push({tag, position, rotation, scale, props})
            }
        }

        return objs
    }

    const objs = load_ksav()

    const game_save_data = deser_obj()

    return {
        header,
        root: save_file_root,
        settings: settings,
        objs,
        game_save_data,
    }
}

function read_types(rd: KleiReader) {
    const read_type = (): SavType => {
        const flags = rd.u8()

        const is_value_type = (flags & SerializationTypeInfo.IS_VALUE_TYPE)

        const read_args = (n?: number): SavType[] => {
            const args: SavType[] = []
            if (flags & SerializationTypeInfo.IS_GENERIC_TYPE) {
                const arg_count = rd.u8()
                if (n !== undefined && arg_count != n) {
                    throw "XXX"
                }

                for (let i = 0; i != arg_count; i++) {
                    args.push(read_type())
                }
            }
            return args
        }

        const check_no_args = () => {
            if (flags & SerializationTypeInfo.IS_GENERIC_TYPE) {
                const arg_count = rd.u8()
                if (arg_count) {
                    throw "XXX"
                }
            }
        }

        switch (flags & SerializationTypeInfo.VALUE_MASK) {
            case SerializationTypeInfo.Pair: {
                const [first_tp, second_tp] = read_args(2)
                return { kind: "pair", first_tp, second_tp }
            }
            case SerializationTypeInfo.Dictionary: {
                const [key_tp, value_tp] = read_args(2)
                return { kind: "dict", key_tp, value_tp }
            }
            case SerializationTypeInfo.List: {
                const [base_tp] = read_args(1)
                return { kind: "list", base_tp }
            }
            case SerializationTypeInfo.HashSet: {
                const [base_tp] = read_args(1)
                return { kind: "set", base_tp }
            }
            case SerializationTypeInfo.Queue: {
                const [base_tp] = read_args(1)
                return { kind: "queue", base_tp }
            }
            case SerializationTypeInfo.Enumeration: {
                const name = rd.string()
                check_no_args()
                return { kind: "enum", name }
            }
            case SerializationTypeInfo.UserDefined: {
                const name = rd.string()
                const args = read_args()
                return { kind: is_value_type? "struct": "class", name, args }
            }
            case SerializationTypeInfo.Array: {
                const base_tp = read_type()
                check_no_args()
                return { kind: "array", base_tp }
            }

            case SerializationTypeInfo.SByte:
                check_no_args()
                return { kind: "i8" }
            case SerializationTypeInfo.Byte:
                check_no_args()
                return { kind: "u8" }
            case SerializationTypeInfo.Boolean:
                check_no_args()
                return { kind: "bool" }
            case SerializationTypeInfo.Int16:
                check_no_args()
                return { kind: "i16" }
            case SerializationTypeInfo.UInt16:
                check_no_args()
                return { kind: "u16" }
            case SerializationTypeInfo.Int32:
                check_no_args()
                return { kind: "i32" }
            case SerializationTypeInfo.UInt32:
                check_no_args()
                return { kind: "u32" }
            case SerializationTypeInfo.Int64:
                check_no_args()
                return { kind: "i64" }
            case SerializationTypeInfo.UInt64:
                check_no_args()
                return { kind: "u64" }
            case SerializationTypeInfo.Single:
                check_no_args()
                return { kind: "f32" }
            case SerializationTypeInfo.Double:
                check_no_args()
                return { kind: "f64" }
            case SerializationTypeInfo.String:
                check_no_args()
                return { kind: "str" }
            case SerializationTypeInfo.Vector2I:
                check_no_args()
                return { kind: "v2i32" }
            case SerializationTypeInfo.Vector2:
                check_no_args()
                return { kind: "v2f32" }
            case SerializationTypeInfo.Vector3:
                check_no_args()
                return { kind: "v3f32" }
            case SerializationTypeInfo.Color:
                check_no_args()
                return { kind: "color" }
            default:
                throw "XXX"
        }
    }

    const types = new Map<string, SavClass>()

    const type_count = rd.i32()
    for (let i = 0; i != type_count; i++) {
        const name = rd.string()

        const field_count = rd.i32()
        const property_count = rd.i32()

        const fields: SavField[] = []
        const props: SavField[] = []

        for (let j = 0; j != field_count; j++) {
            const name = rd.string()
            const type = read_type()
            fields.push({ name, type })
        }

        for (let j = 0; j != property_count; j++) {
            const name = rd.string()
            const type = read_type()
            props.push({ name, type })
        }

        types.set(name, {name, fields, props})
    }

    return types
}