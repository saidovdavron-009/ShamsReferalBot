import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "bigint" })
  telegramId!: string;

  @Column({ type: "varchar", nullable: true })
  username!: string | null;

  @Column({ type: "varchar", nullable: true })
  fullName!: string | null;

  @Column({ type: "boolean", default: false })
  isRegistered!: boolean;

  @Column({ type: "boolean", default: false })
  awaitingRegistration!: boolean;

  @Index()
  @Column({ type: "bigint", nullable: true })
  referredBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
