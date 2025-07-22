module.exports = {
  type: 'sqlite',
  database: './licitafacil.db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  cli: {
    migrationsDir: 'src/migrations'
  },
  synchronize: true, // Para demo apenas
  logging: false
};
