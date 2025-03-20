'use client'

import { Db, parse } from "./parser"
import { DragEvent, useState } from 'react'

async function parseSaveFile(data: Blob): Promise<GridProps> {
    const saveFile = await parse(await data.arrayBuffer())

    const cells: Cell[] = []

    let id = 0
    for (const obj of saveFile.objs) {
        id += 1
        if ('WorldContainer' in obj.props) {
            cells.push({
                id,
                type: obj.tag,
                elemId: 0,
                position: obj.props['WorldContainer']['worldOffset'],
                size: obj.props['WorldContainer']['worldSize'],
                text: obj.props['WorldContainer']['worldName'],
            })
        }
        // if (obj.tag == 'SaveGame') {
        //     for (const si of obj.props['WorldGenSpawner']['spawnInfos']) {
        //         if (
        //         cells.push({
        //             type: 'spawner',
        //             position: {
        //                 x: si.location_x,
        //                 y: si.location_y,
        //             },
        //             elemId: si.element,
        //         })
        //     }
        // }
        // if ('PrimaryElement' in obj.props) {
        //     const position = obj.position
        //     const elemId = (obj.props['PrimaryElement'] as Db)['ElementID'] as number

        //     cells.push({ position, elemId, type: obj.tag })
        // }
    }

    return {
        seed: saveFile.settings,
        width: saveFile.root['WidthInCells'] as number,
        height: saveFile.root['HeightInCells'] as number,
        cells
    }
}

interface Cell {
    id: number
    position: { x: number, y: number }
    size: { x: number, y: number }
    type: string
    elemId: number
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
    const divs = props.cells.map(cell => {
        return <div key={cell.id} style={{
            position: "absolute",
            left: cell.position.x*cellSize,
            top: (props.height - cell.position.y - cell.size.y)*cellSize,
            width: cell.size.x * cellSize,
            height: cell.size.y * cellSize,
            backgroundColor: 'red',
            fontSize: 48,
        }}>{cell.text}</div>
    });

    return <div style={{
        width: props.width*cellSize,
        height: props.height*cellSize,
        backgroundColor: "gray"
    }}>{divs}</div>
}

export default function Home() {
    const [grid, setGrid] = useState<GridProps>(() => ({ seed: "", width: 0, height: 0, cells: [] }))

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

    return (
        <div className="wide" onDrop={handleDrop} onDragOver={handleDragOver}>
            <Grid seed={grid.seed} width={grid.width} height={grid.height} cells={grid.cells}></Grid>
        </div>
    );
}
