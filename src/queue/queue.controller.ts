import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { QueueService, JobType } from './queue.service';

class QueueTextMessageDto {
  to!: string;
  text!: string;
}

class QueueScheduledMessageDto {
  to!: string;
  text!: string;
  delayMs!: number;
}

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getStats() {
    return this.queueService.getQueueStats();
  }

  @Get('job/:id')
  @ApiOperation({ summary: 'Get job details by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async getJob(@Param('id') id: string) {
    const job = await this.queueService.getJob(id);
    if (!job) {
      return { error: 'Job not found' };
    }
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  }

  @Post('text')
  @ApiOperation({ summary: 'Queue a text message for sending' })
  @ApiBody({ type: QueueTextMessageDto })
  @ApiResponse({ status: 201, description: 'Message queued successfully' })
  async queueTextMessage(@Body() dto: QueueTextMessageDto) {
    const jobId = await this.queueService.queueTextMessage({
      to: dto.to,
      text: dto.text,
    });
    return { jobId, status: 'queued' };
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a message to be sent later' })
  @ApiBody({ type: QueueScheduledMessageDto })
  @ApiResponse({ status: 201, description: 'Message scheduled successfully' })
  async scheduleMessage(@Body() dto: QueueScheduledMessageDto) {
    const jobId = await this.queueService.scheduleMessage(
      JobType.SEND_TEXT,
      { to: dto.to, text: dto.text },
      dto.delayMs,
    );
    return {
      jobId,
      status: 'scheduled',
      scheduledFor: new Date(Date.now() + dto.delayMs).toISOString(),
    };
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause the message queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  async pauseQueue() {
    await this.queueService.pauseQueue();
    return { status: 'paused' };
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume the message queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  async resumeQueue() {
    await this.queueService.resumeQueue();
    return { status: 'resumed' };
  }

  @Post('clean')
  @ApiOperation({ summary: 'Clean old completed/failed jobs' })
  @ApiResponse({ status: 200, description: 'Old jobs cleaned' })
  async cleanOldJobs() {
    await this.queueService.cleanOldJobs();
    return { status: 'cleaned' };
  }
}
