import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { WHATSAPP_QUEUE } from './queue.constants';

export enum JobType {
  SEND_TEXT = 'send-text',
  SEND_TEMPLATE = 'send-template',
  SEND_MEDIA = 'send-media',
  SEND_OTP = 'send-otp',
  SEND_REPLY_BUTTONS = 'send-reply-buttons',
  SEND_LIST = 'send-list',
  SEND_CTA = 'send-cta',
}

export interface TextMessageJob {
  to: string;
  text: string;
}

export interface TemplateMessageJob {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}

export interface MediaMessageJob {
  to: string;
  mediaType: string;
  url?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
}

export interface OtpMessageJob {
  to: string;
  otp: string;
}

export interface ReplyButtonsJob {
  to: string;
  body: { text: string };
  header?: { type: string; text?: string; url?: string; mediaId?: string };
  footer?: { text: string };
  buttons: Array<{ id: string; title: string }>;
}

export interface ListMessageJob {
  to: string;
  body: { text: string };
  header?: { type: string; text?: string };
  footer?: { text: string };
  buttonText: string;
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface CtaButtonJob {
  to: string;
  body: { text: string };
  header?: { type: string; text?: string; url?: string; mediaId?: string };
  footer?: { text: string };
  button: { displayText: string; url: string };
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(WHATSAPP_QUEUE)
    private readonly whatsappQueue: Queue,
  ) {}

  /**
   * Add a text message to the queue
   */
  async queueTextMessage(
    data: TextMessageJob,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(JobType.SEND_TEXT, data, {
      ...options,
      priority: options?.priority ?? 2,
    });
    this.logger.debug(`Queued text message to ${data.to}, jobId: ${job.id}`);
    return job.id!;
  }

  /**
   * Add a template message to the queue
   */
  async queueTemplateMessage(
    data: TemplateMessageJob,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(JobType.SEND_TEMPLATE, data, {
      ...options,
      priority: options?.priority ?? 2,
    });
    this.logger.debug(
      `Queued template message to ${data.to}, jobId: ${job.id}`,
    );
    return job.id!;
  }

  /**
   * Add a media message to the queue
   */
  async queueMediaMessage(
    data: MediaMessageJob,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(JobType.SEND_MEDIA, data, {
      ...options,
      priority: options?.priority ?? 3,
    });
    this.logger.debug(`Queued ${data.mediaType} to ${data.to}, jobId: ${job.id}`);
    return job.id!;
  }

  /**
   * Add an OTP message to the queue (high priority)
   */
  async queueOtpMessage(
    data: OtpMessageJob,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(JobType.SEND_OTP, data, {
      ...options,
      priority: options?.priority ?? 1, // Highest priority for OTP
    });
    this.logger.debug(`Queued OTP message to ${data.to}, jobId: ${job.id}`);
    return job.id!;
  }

  /**
   * Schedule a message to be sent at a specific time
   */
  async scheduleMessage(
    jobType: JobType,
    data: any,
    delay: number,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(jobType, data, {
      delay,
    });
    this.logger.debug(
      `Scheduled ${jobType} to ${data.to} in ${delay}ms, jobId: ${job.id}`,
    );
    return job.id!;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.whatsappQueue.getWaitingCount(),
      this.whatsappQueue.getActiveCount(),
      this.whatsappQueue.getCompletedCount(),
      this.whatsappQueue.getFailedCount(),
      this.whatsappQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    return this.whatsappQueue.getJob(jobId);
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    await this.whatsappQueue.pause();
    this.logger.warn('WhatsApp queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    await this.whatsappQueue.resume();
    this.logger.log('WhatsApp queue resumed');
  }

  /**
   * Add a reply buttons message to the queue
   */
  async queueReplyButtons(
    data: ReplyButtonsJob,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(JobType.SEND_REPLY_BUTTONS, data, {
      ...options,
      priority: options?.priority ?? 2,
    });
    this.logger.debug(`Queued reply buttons to ${data.to}, jobId: ${job.id}`);
    return job.id!;
  }

  /**
   * Add a list message to the queue
   */
  async queueListMessage(
    data: ListMessageJob,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(JobType.SEND_LIST, data, {
      ...options,
      priority: options?.priority ?? 2,
    });
    this.logger.debug(`Queued list message to ${data.to}, jobId: ${job.id}`);
    return job.id!;
  }

  /**
   * Add a CTA button message to the queue
   */
  async queueCtaButton(
    data: CtaButtonJob,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.whatsappQueue.add(JobType.SEND_CTA, data, {
      ...options,
      priority: options?.priority ?? 2,
    });
    this.logger.debug(`Queued CTA button to ${data.to}, jobId: ${job.id}`);
    return job.id!;
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(gracePeriod: number = 24 * 3600 * 1000) {
    await this.whatsappQueue.clean(gracePeriod, 1000, 'completed');
    await this.whatsappQueue.clean(gracePeriod * 7, 1000, 'failed');
    this.logger.log('Cleaned old jobs from queue');
  }
}
