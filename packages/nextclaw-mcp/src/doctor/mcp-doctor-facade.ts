import type { Config } from "@nextclaw/core";
import { McpDoctorService } from "./mcp-doctor-service.js";
import type { McpRegistryService } from "../registry/mcp-registry-service.js";
import { type McpDoctorReport } from "../types.js";

export class McpDoctorFacade {
  private readonly doctorService: McpDoctorService;

  constructor(
    private readonly options: {
      getConfig: () => Config;
      registryService?: McpRegistryService;
    }
  ) {
    this.doctorService = new McpDoctorService({
      getConfig: this.options.getConfig,
      registryService: this.options.registryService
    });
  }

  async inspect(name?: string): Promise<McpDoctorReport[]> {
    return await this.doctorService.inspect(name);
  }

  async inspectOne(name: string): Promise<McpDoctorReport | null> {
    const reports = await this.inspect(name);
    return reports[0] ?? null;
  }
}
