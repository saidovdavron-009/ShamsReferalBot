import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { env } from "./env";
import { User } from "../features/users/user.entity";

const connectionOptions: DataSourceOptions = env.databaseUrl
  ? {
      type: "postgres",
      url: env.databaseUrl,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
      synchronize: true,
      logging: false,
      entities: [User],
    }
  : {
      type: "postgres",
      host: env.db.host,
      port: env.db.port,
      username: env.db.username,
      password: env.db.password,
      database: env.db.database,
      synchronize: true,
      logging: false,
      entities: [User],
    };

export const AppDataSource = new DataSource(connectionOptions);
