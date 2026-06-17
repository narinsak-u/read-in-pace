// DTO for creating a comment (or reply) on a book. Text must be 1-2000 characters.
// Optional parentId for replies to existing comments.
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
