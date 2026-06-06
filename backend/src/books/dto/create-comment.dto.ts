// DTO for creating a comment on a book. Text must be 1-2000 characters.
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}
