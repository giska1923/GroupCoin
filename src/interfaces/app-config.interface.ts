interface DbConfig {
  host: string | undefined;
  port: number;
  username: string | undefined;
  password: string | undefined;
  name: string | undefined;
  logging?: boolean | undefined;
}

interface AppConfig {
  port: number;
  db: DbConfig;
}

export default AppConfig;
