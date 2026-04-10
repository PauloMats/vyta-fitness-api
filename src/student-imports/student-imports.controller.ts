import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { ConfirmStudentImportDto } from './dto/confirm-student-import.dto';
import { ListStudentImportsDto } from './dto/list-student-imports.dto';
import { UpdateStudentImportMappingDto } from './dto/update-student-import-mapping.dto';
import { StudentImportsService } from './student-imports.service';

type MultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

@ApiTags('student-imports')
@ApiBearerAuth()
@Roles('TRAINER', 'ADMIN')
@Controller('student-imports')
export class StudentImportsController {
  constructor(private readonly studentImportsService: StudentImportsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        sourcePlatform: { type: 'string' },
      },
      required: ['file'],
    },
  })
  async create(@CurrentUser() user: JwtUser, @Req() request: MultipartRequest) {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }
    if (file.mimetype !== 'application/pdf' && !file.filename.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF files are supported');
    }

    const sourcePlatform =
      typeof file.fields?.sourcePlatform === 'object' &&
      file.fields.sourcePlatform &&
      'value' in file.fields.sourcePlatform
        ? String(file.fields.sourcePlatform.value)
        : undefined;

    return this.studentImportsService.createFromPdf(
      user,
      {
        filename: file.filename,
        buffer: await file.toBuffer(),
      },
      sourcePlatform,
    );
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListStudentImportsDto) {
    return this.studentImportsService.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.studentImportsService.findOne(user, id);
  }

  @Get(':id/preview')
  preview(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.studentImportsService.preview(user, id);
  }

  @Patch(':id/mapping')
  updateMapping(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateStudentImportMappingDto) {
    return this.studentImportsService.updateMapping(user, id, dto);
  }

  @Post(':id/confirm')
  confirm(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: ConfirmStudentImportDto) {
    return this.studentImportsService.confirm(user, id, dto);
  }
}
