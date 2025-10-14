interface TransactionalEmail {
  to: string;
  subject: string;
  template: "verify" | "reset" | "report-receipt" | string;
  context?: Record<string, unknown>;
}

export const sendTransactionalEmail = async (email: TransactionalEmail) => {
  if (process.env.NODE_ENV !== "production") {
    console.info("[email:stub]", { ...email, preview: true });
  }
  return { ok: true };
};
