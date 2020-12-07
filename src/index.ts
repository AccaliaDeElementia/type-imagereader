
import synchronize from './utils/syncfolders'
import app from './Server'

if (!process.env.SKIP_SYNC) {
  synchronize()
}
// Start the server
const port = Number(process.env.PORT || 3030)
app.listen(port, () => {})
