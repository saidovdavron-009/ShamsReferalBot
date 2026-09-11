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

  @Column({ type: "int", nullable: true })
  age!: number | null;

  @Column({ type: "varchar", nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", nullable: true })
  arabicLevel!: string | null;

  @Column({ type: "varchar", nullable: true })
  gender!: string | null;

  @Column({ type: "varchar", nullable: true })
  studyForm!: string | null;

  @Column({ type: "varchar", nullable: true })
  tariff!: string | null;

  @Column({ type: "boolean", default: false })
  isRegistered!: boolean;

  @Column({ type: "varchar", nullable: true })
  registrationStep!: string | null;

  @Index()
  @Column({ type: "bigint", nullable: true })
  referredBy!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", nullable: true })
  voucherCode!: string | null;

  @Column({ type: "timestamp", nullable: true })
  certificateIssuedAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  bookingRequestedAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  adminContactRequestedAt!: Date | null;

  @Column({ type: "boolean", nullable: true })
  courseEnrolled!: boolean | null;

  @Column({ type: "timestamp", nullable: true })
  enrollmentConfirmLastSentAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  reminder24hSentAt!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  reminder40hSentAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
