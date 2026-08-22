import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "bot_groups" })
export class BotGroup {
  @PrimaryColumn({ type: "bigint" })
  chatId!: string;

  @Column({ type: "varchar", nullable: true })
  title!: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
