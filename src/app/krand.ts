export class KRand {

    constructor(seed: number) {
        const intmax = +0x7fff_ffff
        const intmin = -0x8000_0000
        const mod = 0x1_0000_0000

        let v1 = 161803398 - seed
        let v2 = 1

        const arr = Array.from({length: 56}, () => 0)
        arr[55] = v1

        for (let i = 1; i < 55; i++) {
            const idx = 21*i % 55
            arr[idx] = v2

            v2 = v1 - v2
            if (v2 < 0)
                v2 += intmax
            v1 = arr[idx]
        }

        for (let i = 0; i < 4; i++) {
            for (let k = 1; k < 56; k++) {
                arr[k] -= arr[1 + (k+30)%55]
                if (arr[k] < 0)
                    arr[k] += intmax
            }
        }

        this._inext = 0
        this._inextp = 21
        this._arr = arr
    }

    next(): number {
        const intmax = +0x7fff_ffff
        const intmin = -0x8000_0000
        const mod = 0x1_0000_0000

        this._inext += 1
        if (this._inext >= 56)
            this._inext = 1

        this._inextp += 1
        if (this._inextp >= 56)
            this._inextp = 1

        let n = this._arr[this._inext] - this._arr[this._inextp]
        while (n < intmin)
            n += mod
        while (n > intmax)
            n -= mod
        if (n == intmax)
            n -= 1
        if (n < 0)
            n += intmax

        this._arr[this._inext] = n
        return n
    }

    float(): number {
        return this.next() * 4.656612875245797E-10
    }

    int(min: number, max: number): number {
        const size = max - min
        return Math.trunc(this.float() * size + min)
    }

    private _inext: number
    private _inextp: number
    private _arr: number[]
}
