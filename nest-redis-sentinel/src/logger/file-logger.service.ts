import { LoggerService } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

type LogLevel = "log" | "error" | "warn" | "debug" | "verbose";

// Simple rotating file logger (size-based) that mirrors output to console.
export class FileLogger implements LoggerService {
  private readonly logDir = process.env.LOG_DIR || "/app/log";
  private readonly logFile = "app.log";
  private readonly maxBytes =
    Number(process.env.LOG_MAX_BYTES || 1_000_000) || 1_000_000;

  private stream: fs.WriteStream;
  private currentSize = 0;

  constructor() {
    fs.mkdirSync(this.logDir, { recursive: true });
    const fullPath = this.filePath();
    if (fs.existsSync(fullPath)) {
      this.currentSize = fs.statSync(fullPath).size;
    }
    this.stream = fs.createWriteStream(fullPath, { flags: "a" });
  }

  log(message: any, ...optionalParams: any[]) {
    this.write("log", message, optionalParams);
    console.log(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.write("error", message, optionalParams);
    console.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.write("warn", message, optionalParams);
    console.warn(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.write("debug", message, optionalParams);
    console.debug?.(message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.write("verbose", message, optionalParams);
    console.log(message, ...optionalParams);
  }

  private write(level: LogLevel, message: any, extra: any[]) {
    const time = new Date().toISOString();
    const line = `[${time}] ${level.toUpperCase()}: ${this.stringify(
      message
    )} ${this.stringify(extra)}\n`;

    this.rotateIfNeeded(Buffer.byteLength(line));
    this.stream.write(line);
    this.currentSize += Buffer.byteLength(line);
  }

  private rotateIfNeeded(nextBytes: number) {
    if (this.currentSize + nextBytes <= this.maxBytes) return;

    this.stream.end();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");
    const fullPath = this.filePath();
    const rotated = path.join(
      this.logDir,
      `${this.logFile}.${timestamp}.log`
    );
    try {
      if (fs.existsSync(fullPath)) {
        fs.renameSync(fullPath, rotated);
      }
    } catch (err) {
      // If rotation fails, keep writing to the current file to avoid losing logs.
      console.warn("[logger] rotation failed", err);
    }

    this.stream = fs.createWriteStream(fullPath, { flags: "a" });
    this.currentSize = 0;
  }

  private filePath() {
    return path.join(this.logDir, this.logFile);
  }

  private stringify(value: any): string {
    if (value === undefined) return "";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
