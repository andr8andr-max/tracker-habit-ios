import { DataSourceOptions } from 'typeorm';

export function buildDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5433'}/${process.env.PGDATABASE || 'club'}`
  );
}

export function buildDataSourceOptions(): DataSourceOptions & { autoLoadEntities: boolean } {
  return {
    type: 'postgres',
    url: buildDatabaseUrl(),
    autoLoadEntities: true,
    synchronize: String(process.env.TYPEORM_SYNC ?? 'true') !== 'false',
    logging: false,
  };
}
