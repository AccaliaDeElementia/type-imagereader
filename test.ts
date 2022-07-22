import fsWalker from './utils/fswalker'

fsWalker('/data', (items: {path: string, isFile: boolean}[], _: Number) => {
  const dirs = items.filter(item => !item.isFile)
  dirs.forEach(dir => {
    console.log(dir.path)
  })
  return Promise.resolve()
}).then(() => console.log('done!'))
