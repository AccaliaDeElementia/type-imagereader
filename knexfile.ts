'use sanity'

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'postgres',
      database: 'postgres',
      user: 'postgres',
      password: 'password',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },

  // sqlite3: {
  //   client: 'sqlite3',
  //   connection: {
  //     filename: './dev.sqlite3'
  //   },
  //   useNullAsDefault: true,
  //   migrations: {
  //     tableName: 'knex_migrations'
  //   }
  // },

  postgresql: {
    client: 'postgresql',
    connection: {
      host: 'postgres',
      database: 'postgres',
      user: 'postgres',
      password: 'password',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  },
}
