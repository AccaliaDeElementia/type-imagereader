import fsWalker from './utils/fswalker'

fsWalker('/data', async (items: Array<{ path: string, isFile: boolean }>, _: number) => {
  const dirs = items.filter(item => !item.isFile)
  dirs.forEach(dir => {
    console.log(dir.path)
  })
  await Promise.resolve()
}).then(() => { console.log('done!') }, (err) => { console.error('whoops!', err) })
