'use client'

import { parse, parse_worldgen } from "./parser"
import { DragEvent, useState } from 'react'
import { gen_traits, geysers } from "./world_traits"
import { KRand } from "./krand"

function defaultGridProps(): GridProps {
    return { seed: "", width: 0, height: 0, cells: [] }
}

async function parseSaveFile(data: Blob): Promise<GridProps> {
    //const saveFile = await parse(await data.arrayBuffer())

    const cells: Cell[] = []

    const worldgen = await parse_worldgen(await data.arrayBuffer()) as any
    for (const world of worldgen.worlds) {
        const offset = world.data.world.offset
        const sd = world.data.gameSpawnData

        cells.push({
            size: { x: world.data.world.size.x, y: world.data.world.size.y },
            position: { x: offset.x, y: offset.y },
            color: "gray",
            text: world.name,
        })

        for (const item of sd.buildings) {
            if (item.id.indexOf("quarters") >= 0) {
                cells.push({
                    size: { x: 10, y: 10 },
                    position: { x: offset.x + item.location_x, y: offset.y + item.location_y },
                    color: "green",
                    text: item.id,
                })
            }
        }

        for (const item of sd.otherEntities) {
            if (item.id.indexOf('Geyser') >= 0) {
                if (item.id == 'GeyserGeneric') {
                    const seed = world.data.globalWorldSeed + Math.floor(item.location_x) + Math.floor(item.location_y) + 7
                    const r = new KRand(seed)
                    const idx = r.int(0, geysers.length)
                    item.id = `GeyserGeneric_${geysers[idx]}`
                }

                cells.push({
                    //elemId: 1,
                    //id: 1,
                    size: { x: 4, y: 4 },
                    position: { x: offset.x + item.location_x, y: offset.y + item.location_y },
                    //type: "geyser",
                    color: 'red',
                    text: (item.id as string).slice(14),
                })
            }
            // } else if (item.id.indexOf('Seed') < 0 && item.id.indexOf('Plant') < 0 && item.id.indexOf('Flower') < 0 && item.id.indexOf('Grass') < 0) {
            //     cells.push({
            //         elemId: 1,
            //         id: 1,
            //         size: { x: 1, y: 1 },
            //         position: { x: offset.x + item.location_x, y: offset.y + item.location_y },
            //         type: "geyser",
            //         text: item.id,
            //     })
            // }
        }
    }

    return {
        seed: worldgen.worlds[0].data.globalWorldSeed,
        width: worldgen.size.x,
        height: worldgen.size.y,
        cells: cells
    }

    // const cells: Cell[] = []

    // let id = 0
    // for (const obj of saveFile.objs) {
    //     id += 1
    //     if ('WorldContainer' in obj.props) {
    //         cells.push({
    //             id,
    //             type: obj.tag,
    //             elemId: 0,
    //             position: obj.props['WorldContainer']['worldOffset'],
    //             size: obj.props['WorldContainer']['worldSize'],
    //             text: obj.props['WorldContainer']['worldName'],
    //         })
    //     }
    //     // if (obj.tag == 'SaveGame') {
    //     //     for (const si of obj.props['WorldGenSpawner']['spawnInfos']) {
    //     //         if (
    //     //         cells.push({
    //     //             type: 'spawner',
    //     //             position: {
    //     //                 x: si.location_x,
    //     //                 y: si.location_y,
    //     //             },
    //     //             elemId: si.element,
    //     //         })
    //     //     }
    //     // }
    //     // if ('PrimaryElement' in obj.props) {
    //     //     const position = obj.position
    //     //     const elemId = (obj.props['PrimaryElement'] as Db)['ElementID'] as number

    //     //     cells.push({ position, elemId, type: obj.tag })
    //     // }
    // }

    // return {
    //     seed: saveFile.settings,
    //     width: saveFile.root['WidthInCells'] as number,
    //     height: saveFile.root['HeightInCells'] as number,
    //     cells
    // }
}

interface Cell {
    //id: number
    position: { x: number, y: number }
    size: { x: number, y: number }
    //type: string
    //elemId: number
    color: string
    text?: string
}

interface GridProps {
    seed: string
    width: number
    height: number
    cells: Cell[]
}

const cellSize = 5

function Grid(props: GridProps) {
    const divs = props.cells.map((cell, index) => {
        return <div key={index} style={{
            position: "absolute",
            left: cell.position.x*cellSize,
            top: (props.height - cell.position.y - cell.size.y)*cellSize,
            width: cell.size.x * cellSize,
            height: cell.size.y * cellSize,
            backgroundColor: cell.color,
            textAlign: 'center',
            //fontSize: 48,
        }}>{cell.text}</div>
    });

    return <div style={{
        width: props.width*cellSize,
        height: props.height*cellSize,
    }}>{divs}</div>
}

export default function Home() {
    const [grid, setGrid] = useState<GridProps>(defaultGridProps)

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
    }

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()

        for (const item of e.dataTransfer.items) {
            if (item.kind != 'file') {
                continue
            }

            const file = item.getAsFile()
            if (file) {
                setGrid(await parseSaveFile(file))
            }
        }
    }

    const [seeds, setSeeds] = useState<string[]>(() => [])

    const generateSeed = () => {
        const isValidSeed = (traits: string[]) => {
            for (const trait of ['GeoActive', 'MetalRich', 'expansion1::IrregularOil']) {
                if (!traits.includes(trait))
                    return false
            }

            for (const trait of ['BouldersLarge', 'BouldersMedium', 'BouldersMixed', 'BouldersSmall', 'GlaciersLarge', 'SlimeSplats', 'GeoDormant']) {
                if (traits.includes(trait))
                    return false
            }

            return true
        }

        while (true) {
            const seed = Math.trunc(Math.random()*2000000000)
            const traits = gen_traits(seed)

            if (isValidSeed(traits)) {
                setSeeds([...seeds, `V-SFRZ-C-${seed}-0-D3-UE2 ${traits}`])
                break
            }
        }
    }

    const seedItems = []
    for (const sd of seeds) {
        seedItems.push(<li>{sd}</li>)
    }

    const xxx = () => {
        for (let i = -100; i < 100; i++) {
            const r = new KRand(444812768 + 38 + 225 + i)
            const idx = r.int(0, geysers.length)
            if (geysers[idx] == 'molten_aluminum')
                console.log(i)
        }
    }

    return (
        <div onDrop={handleDrop} onDragOver={handleDragOver}>
            <p><button onClick={xxx}>xxx</button></p>
            <p><button onClick={generateSeed}>Generate seed</button></p>
            <ul>{seedItems}</ul>
            <Grid seed={grid.seed} width={grid.width} height={grid.height} cells={grid.cells}></Grid>
        </div>
    );
}
