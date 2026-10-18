import { NotFoundException } from "@nestjs/common";
import { EvaluationsService } from "./evaluations.service";
import { PrismaService } from "../prisma.service";
import { AuditService } from "../audit.service";

describe("Removing an application", () => {
  const user = { id: "professional", organizationId: "organization", email: "test@example.com", role: "PSYCHOLOGIST" };
  const application = { id: "application", evaluationId: "evaluation", instrumentVersionId: "version" };

  function setup(statuses: string[] = []) {
    const transaction = {
      instrumentApplication: {
        findFirst: jest.fn().mockResolvedValue(application),
        delete: jest.fn().mockResolvedValue(application),
      },
      evaluation: {
        findUnique: jest.fn().mockResolvedValue({ applications: statuses.map((status) => ({ status })) }),
        update: jest.fn().mockResolvedValue({}),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn().mockImplementation((callback) => callback(transaction)) };
    const service = new EvaluationsService(prisma as unknown as PrismaService, {} as AuditService);
    return { service, transaction };
  }

  it.each([
    [[], "DRAFT"],
    [["IN_PROGRESS", "LOCKED"], "IN_PROGRESS"],
    [["LOCKED"], "COMPLETED"],
    [["CALCULATED"], "CALCULATED"],
    [["REVIEWED"], "REVIEWED"],
  ])("updates the evaluation with remaining statuses %j to %s", async (statuses, expected) => {
    const { service, transaction } = setup(statuses as string[]);
    await expect(service.removeApplication(user, application.id)).resolves.toEqual({ id: application.id });
    expect(transaction.instrumentApplication.delete).toHaveBeenCalledWith({
      where: { id: application.id, organizationId: user.organizationId },
    });
    expect(transaction.evaluation.update).toHaveBeenCalledWith({
      where: { id: application.evaluationId }, data: { status: expected },
    });
    expect(transaction.auditEvent.create).toHaveBeenCalledWith({ data: {
      organizationId: user.organizationId,
      userId: user.id,
      event: "INSTRUMENT_REMOVED",
      entityType: "InstrumentApplication",
      entityId: application.id,
      metadata: { evaluationId: application.evaluationId, instrumentVersionId: application.instrumentVersionId },
    } });
  });

  it("rejects missing applications and applications outside the organization", async () => {
    const { service, transaction } = setup();
    transaction.instrumentApplication.findFirst.mockResolvedValue(null);
    await expect(service.removeApplication(user, "missing")).rejects.toThrow(NotFoundException);
    expect(transaction.instrumentApplication.findFirst).toHaveBeenCalledWith({
      where: { id: "missing", organizationId: user.organizationId },
    });
    expect(transaction.instrumentApplication.delete).not.toHaveBeenCalled();
    expect(transaction.evaluation.update).not.toHaveBeenCalled();
    expect(transaction.auditEvent.create).not.toHaveBeenCalled();
  });

  it("does not report success when deletion fails", async () => {
    const { service, transaction } = setup();
    transaction.instrumentApplication.delete.mockRejectedValue(new Error("Deletion failed"));
    await expect(service.removeApplication(user, application.id)).rejects.toThrow("Deletion failed");
    expect(transaction.evaluation.update).not.toHaveBeenCalled();
    expect(transaction.auditEvent.create).not.toHaveBeenCalled();
  });
});
