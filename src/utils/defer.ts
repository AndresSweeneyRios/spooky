export const defer = <TValue>() => {
  let resolve: (value: TValue) => void
  let reject: (reason: any) => void

  const promise = new Promise<TValue>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { resolve: resolve!, reject: reject!, promise }
}

export const until = (condition: () => boolean) => {
  return new Promise<void>((resolve) => {
    const checkCondition = () => {
      if (condition()) {
        resolve()
      } else {
        requestAnimationFrame(checkCondition)
      }
    }

    checkCondition()
  })
}
