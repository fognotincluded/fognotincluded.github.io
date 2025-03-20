export class KleiReader {
    constructor(buf: ArrayBuffer, offset: number = 0, len?: number) {
        this._src = new DataView(buf, offset, len)
        this._pos = 0
    }

    u8(): number {
        const r = this._src.getUint8(this._pos)
        this._pos += 1
        return r
    }

    i32(): number {
        const r = this._src.getInt32(this._pos, true)
        this._pos += 4
        return r
    }

    u32(): number {
        const r = this._src.getUint32(this._pos, true)
        this._pos += 4
        return r
    }

    f32(): number {
        const r = this._src.getFloat32(this._pos, true)
        this._pos += 4
        return r
    }

    v2i32() {
        const x = this.i32()
        const y = this.i32()
        return {x, y}
    }

    v2f32() {
        const x = this.f32()
        const y = this.f32()
        return {x, y}
    }

    v3f32() {
        const x = this.f32()
        const y = this.f32()
        const z = this.f32()
        return {x, y, z}
    }

    v4f32() {
        const x = this.f32()
        const y = this.f32()
        const z = this.f32()
        const w = this.f32()
        return {x, y, z, w}
    }

    bytes(len: number): ArrayBuffer {
        if (len < 0)
            throw "XXX"
        const r = this._src.buffer.slice(this._pos, this._pos + len)
        this._pos += len
        return r
    }

    string(): string {
        const len = this.i32()
        if (len < 0)
            throw "XXX"
        const bytes = this.bytes(len)
        return this._utf8.decode(bytes)
    }

    nullable_string(): string | null {
        const len = this.i32()
        if (len < 0)
            return null
        const bytes = this.bytes(len)
        return this._utf8.decode(bytes)
    }

    fixed_len_string(len: number): string {
        const bytes = this.bytes(len)
        return this._utf8.decode(bytes)
    }

    tail(): ArrayBuffer {
        return this._src.buffer.slice(this._src.byteOffset + this._pos)
    }

    skip(len: number) {
        this._pos += len
    }

    tell(): number {
        return this._pos
    }

    seek(pos: number) {
        this._pos = pos
    }

    private _utf8 = new TextDecoder()
    private _src: DataView<ArrayBuffer>
    private _pos: number
}
