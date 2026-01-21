import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { WHATSAPP_QUEUE } from '../queue.constants';
import {
  JobType,
  TextMessageJob,
  TemplateMessageJob,
  MediaMessageJob,
  OtpMessageJob,
  ReplyButtonsJob,
  ListMessageJob,
  CtaButtonJob,
} from '../queue.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { MediaType } from '../../whatsapp/dto/send-media-message.dto';

@Processor(WHATSAPP_QUEUE)
export class WhatsappQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappQueueProcessor.name);

  constructor(
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case JobType.SEND_TEXT:
          return await this.processTextMessage(job.data as TextMessageJob);

        case JobType.SEND_TEMPLATE:
          return await this.processTemplateMessage(
            job.data as TemplateMessageJob,
          );

        case JobType.SEND_MEDIA:
          return await this.processMediaMessage(job.data as MediaMessageJob);

        case JobType.SEND_OTP:
          return await this.processOtpMessage(job.data as OtpMessageJob);

        case JobType.SEND_REPLY_BUTTONS:
          return await this.processReplyButtons(job.data as ReplyButtonsJob);

        case JobType.SEND_LIST:
          return await this.processListMessage(job.data as ListMessageJob);

        case JobType.SEND_CTA:
          return await this.processCtaButton(job.data as CtaButtonJob);

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to process job ${job.id}: ${err.message}`,
        err.stack,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  private async processTextMessage(data: TextMessageJob) {
    this.logger.debug(`Sending text message to ${data.to}`);
    return await this.whatsappService.sendTextMessage(data.to, data.text);
  }

  private async processTemplateMessage(data: TemplateMessageJob) {
    this.logger.debug(`Sending template ${data.templateName} to ${data.to}`);
    return await this.whatsappService.sendTemplateMessage(
      data.to,
      data.templateName,
      data.languageCode || 'fr',
      data.components,
    );
  }

  private async processMediaMessage(data: MediaMessageJob) {
    this.logger.debug(`Sending ${data.mediaType} to ${data.to}`);
    return await this.whatsappService.sendMediaMessage({
      to: data.to,
      mediaType: data.mediaType as MediaType,
      url: data.url,
      mediaId: data.mediaId,
      caption: data.caption,
      filename: data.filename,
    });
  }

  private async processOtpMessage(data: OtpMessageJob) {
    this.logger.debug(`Sending OTP to ${data.to}`);
    return await this.whatsappService.sendOtpMessage(data.to, data.otp);
  }

  private async processReplyButtons(data: ReplyButtonsJob) {
    this.logger.debug(`Sending reply buttons to ${data.to}`);
    return await this.whatsappService.sendReplyButtons({
      to: data.to,
      body: data.body,
      header: data.header as any,
      footer: data.footer,
      buttons: data.buttons,
    });
  }

  private async processListMessage(data: ListMessageJob) {
    this.logger.debug(`Sending list message to ${data.to}`);
    return await this.whatsappService.sendListMessage({
      to: data.to,
      body: data.body,
      header: data.header as any,
      footer: data.footer,
      buttonText: data.buttonText,
      sections: data.sections,
    });
  }

  private async processCtaButton(data: CtaButtonJob) {
    this.logger.debug(`Sending CTA button to ${data.to}`);
    return await this.whatsappService.sendCtaButton({
      to: data.to,
      body: data.body,
      header: data.header as any,
      footer: data.footer,
      button: data.button,
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
