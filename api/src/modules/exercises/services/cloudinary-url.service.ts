import { Injectable } from '@nestjs/common';

import {
  CloudinaryDeliveryType,
  ExerciseMediaType,
} from '../../../generated/prisma/client.js';
import type { ExerciseMedia } from '../../../generated/prisma/client.js';

type DeliveryReference = Pick<
  ExerciseMedia,
  | 'type'
  | 'cloudinaryCloudName'
  | 'cloudinaryPublicId'
  | 'cloudinaryDeliveryType'
  | 'cloudinaryVersion'
  | 'cloudinaryFormat'
>;

@Injectable()
export class CloudinaryUrlService {
  resolve(media: DeliveryReference): string | null {
    if (media.cloudinaryDeliveryType !== CloudinaryDeliveryType.UPLOAD)
      return null;

    const resourceType =
      media.type === ExerciseMediaType.IMAGE ? 'image' : 'video';
    const publicId = media.cloudinaryPublicId
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    // v1 separa el public_id de posibles transformaciones cuando no hay versión guardada.
    const version = media.cloudinaryVersion?.toString() ?? '1';
    const extension = media.cloudinaryFormat
      ? `.${media.cloudinaryFormat}`
      : '';

    return `https://res.cloudinary.com/${media.cloudinaryCloudName}/${resourceType}/upload/v${version}/${publicId}${extension}`;
  }
}
