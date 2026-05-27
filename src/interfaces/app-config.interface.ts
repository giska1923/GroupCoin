interface DbConfig {
  host: string | undefined;
  port: number;
  username: string | undefined;
  password: string | undefined;
  name: string | undefined;
  logging?: boolean | undefined;
}

interface AppConfig {
  env: string | undefined;
  port: number;
  db: DbConfig;
}

export default AppConfig;
