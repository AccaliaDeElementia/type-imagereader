/* globals module */
module.exports = {
  overrides: [{
    files: ["*.ts"],
    env: {
      es2022: true,
      node: false,
      browser: true
    },
  }]
}
