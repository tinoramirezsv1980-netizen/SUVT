import { UploadApiResponse } from 'cloudinary';
import cloudinary from '../config/cloudinary';

export interface UploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
}

class CloudinaryService {

  /**
   * Sube un archivo directamente desde un Buffer a Cloudinary.
   */
  async uploadFile(
    buffer: Buffer,
    folder: string = 'SUVT/Misiones'
  ): Promise<UploadResult> {

    return new Promise((resolve, reject) => {

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result?: UploadApiResponse) => {

          if (error) {
            return reject(error);
          }

          if (!result) {
            return reject(new Error('Cloudinary no devolvió información del archivo'));
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Elimina un archivo de Cloudinary mediante su public_id.
   */
  async deleteFile(
    publicId: string,
    resourceType: string = 'image'
  ) {

    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

  }

}

export default new CloudinaryService();
