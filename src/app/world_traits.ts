import { KRand } from "./krand"

const all_traits = [
    "BouldersLarge",
    "BouldersMedium",
    "BouldersMixed",
    "BouldersSmall",
    "DeepOil",
    "FrozenCore",
    "GeoActive",
    "Geodes",
    "GeoDormant",
    "GlaciersLarge",
    "MagmaVents",
    "MetalPoor",
    "MetalRich",
    "MisalignedStart",
    "SlimeSplats",

    "expansion1::CrashedSatellites",
    "expansion1::IrregularOil",
    "expansion1::MetalCaves",
    "expansion1::Volcanoes",
]

export function gen_traits(seed: number) {
    const r = new KRand(seed)

    const traits = []

    const avail_traits = [...all_traits]
    const trait_count = r.int(2, 5)

    while (traits.length < trait_count) {
        const i = r.int(0, avail_traits.length)
        const cur = avail_traits[i]
        traits.push(cur)
        avail_traits.splice(i, 1)
    }

    return traits
}

export const geysers = [
    "steam",
    "hot_steam",
    "hot_water",
    "slush_water",
    "filthy_water",
    "slush_salt_water",
    "salt_water",
    "small_volcano",
    "big_volcano",
    "liquid_co2",
    "hot_co2",
    "hot_hydrogen",
    "hot_po2",
    "slimy_po2",
    "chlorine_gas",
    "methane",
    "molten_copper",
    "molten_iron",
    "molten_gold",
    "molten_aluminum",
    // "molten_tungsten",
    // "molten_niobium",
    "molten_cobalt",
    "oil_drip",
    "liquid_sulfur",
]
