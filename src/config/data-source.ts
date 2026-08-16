import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";
import { User } from "../features/users/user.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  synchronize: true,
  logging: false,
  entities: [User],
});
