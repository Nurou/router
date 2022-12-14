export type NoInfer<T> = [T][T extends any ? 0 : never]
export type IsAny<T, Y, N> = 1 extends 0 & T ? Y : N
export type IsAnyBoolean<T> = 1 extends 0 & T ? true : false
export type IsKnown<T, Y, N> = unknown extends T ? N : Y
export type PickAsRequired<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>
export type PickAsPartial<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>
export type PickUnsafe<T, K> = K extends keyof T ? Pick<T, K> : never
export type PickExtra<T, K> = Expand<{
  [TKey in keyof K as string extends TKey
    ? never
    : TKey extends keyof T
    ? never
    : TKey]: K[TKey]
}>
export type PickRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
}

export type Expand<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: O[K] }
    : never
  : T

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => any
  ? I
  : never

export type Values<O> = O[ValueKeys<O>]
export type ValueKeys<O> = Extract<keyof O, PropertyKey>

export type DeepAwaited<T> = T extends Promise<infer A>
  ? DeepAwaited<A>
  : T extends Record<infer A, Promise<infer B>>
  ? { [K in A]: DeepAwaited<B> }
  : T

export type PathParamMask<TRoutePath extends string> =
  TRoutePath extends `${infer L}/$${infer C}/${infer R}`
    ? PathParamMask<`${L}/${string}/${R}`>
    : TRoutePath extends `${infer L}/$${infer C}`
    ? PathParamMask<`${L}/${string}`>
    : TRoutePath

export type Timeout = ReturnType<typeof setTimeout>

export type Updater<TPrevious, TResult = TPrevious> =
  | TResult
  | ((prev?: TPrevious) => TResult)

export type PickExtract<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}

export type PickExclude<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K]
}

/**
 * This function returns `a` if `b` is deeply equal.
 * If not, it will replace any deeply equal children of `b` with those of `a`.
 * This can be used for structural sharing between JSON values for example.
 */
export function sharedClone<T>(prev: any, next: T, touchAll?: boolean): T {
  const things = new Map()

  function recurse(prev: any, next: any) {
    if (prev === next) {
      return prev
    }

    if (things.has(next)) {
      return things.get(next)
    }

    const prevIsArray = Array.isArray(prev)
    const nextIsArray = Array.isArray(next)
    const prevIsObj = isPlainObject(prev)
    const nextIsObj = isPlainObject(next)

    const isArray = prevIsArray && nextIsArray
    const isObj = prevIsObj && nextIsObj

    const isSameStructure = isArray || isObj

    // Both are arrays or objects
    if (isSameStructure) {
      const aSize = isArray ? prev.length : Object.keys(prev).length
      const bItems = isArray ? next : Object.keys(next)
      const bSize = bItems.length
      const copy: any = isArray ? [] : {}

      let equalItems = 0

      for (let i = 0; i < bSize; i++) {
        const key = isArray ? i : bItems[i]
        if (copy[key] === prev[key]) {
          equalItems++
        }
      }
      if (aSize === bSize && equalItems === aSize) {
        things.set(next, prev)
        return prev
      }
      things.set(next, copy)
      for (let i = 0; i < bSize; i++) {
        const key = isArray ? i : bItems[i]
        if (typeof bItems[i] === 'function') {
          copy[key] = prev[key]
        } else {
          copy[key] = recurse(prev[key], next[key])
        }
        if (copy[key] === prev[key]) {
          equalItems++
        }
      }

      return copy
    }

    if (nextIsArray) {
      const copy: any[] = []
      things.set(next, copy)
      for (let i = 0; i < next.length; i++) {
        copy[i] = recurse(undefined, next[i])
      }
      return copy as T
    }

    if (nextIsObj) {
      const copy = {} as any
      things.set(next, copy)
      const nextKeys = Object.keys(next)
      for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i]!
        copy[key] = recurse(undefined, next[key])
      }
      return copy as T
    }

    return next
  }

  return recurse(prev, next)
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
function isPlainObject(o: any) {
  if (!hasObjectPrototype(o)) {
    return false
  }

  // If has modified constructor
  const ctor = o.constructor
  if (typeof ctor === 'undefined') {
    return true
  }

  // If has modified prototype
  const prot = ctor.prototype
  if (!hasObjectPrototype(prot)) {
    return false
  }

  // If constructor does not have an Object-specific method
  if (!prot.hasOwnProperty('isPrototypeOf')) {
    return false
  }

  // Most likely a plain Object
  return true
}

function hasObjectPrototype(o: any) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

export function last<T>(arr: T[]) {
  return arr[arr.length - 1]
}

export function warning(cond: any, message: string): cond is true {
  if (cond) {
    if (typeof console !== 'undefined') console.warn(message)

    try {
      throw new Error(message)
    } catch {}
  }

  return true
}

function isFunction(d: any): d is Function {
  return typeof d === 'function'
}

export function functionalUpdate<TResult>(
  updater: Updater<TResult>,
  previous: TResult,
) {
  if (isFunction(updater)) {
    return updater(previous as TResult)
  }

  return updater
}

export function pick<T, K extends keyof T>(parent: T, keys: K[]): Pick<T, K> {
  return keys.reduce((obj: any, key: K) => {
    obj[key] = parent[key]
    return obj
  }, {} as any)
}
