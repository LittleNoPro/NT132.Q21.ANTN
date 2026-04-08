import base64
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models.image import Image
from bson import ObjectId

images_bp = Blueprint('images', __name__)

def get_optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except:
        return None

@images_bp.route('/upload', methods=['POST'])
def upload_image():
    user_id = get_optional_user_id()

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    note_id = request.form.get('note_id')

    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400


    allowed_types = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}
    if file.content_type not in allowed_types:
        return jsonify({'error': 'Invalid image type. Allowed: PNG, JPEG, GIF, WebP'}), 400


    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    if size > 5 * 1024 * 1024:
        return jsonify({'error': 'Image too large. Maximum size is 5MB'}), 400


    image_data = file.read()


    image = Image.create(
        filename=file.filename,
        content_type=file.content_type,
        data=image_data,
        size=size,
        note_id=note_id,
        uploaded_by=user_id
    )

    if not image:
        return jsonify({'error': 'Failed to save image'}), 500


    image_url = f"/api/images/{image['_id']}"

    return jsonify({
        'message': 'Image uploaded successfully',
        'id': str(image['_id']),
        'url': image_url,
        'filename': file.filename,
        'size': size
    }), 201

@images_bp.route('/<image_id>', methods=['GET'])
def get_image(image_id):
    try:
        image = Image.find_by_id(image_id)

        if not image:
            return jsonify({'error': 'Image not found'}), 404


        return send_file(
            BytesIO(image['data']),
            mimetype=image['content_type'],
            as_attachment=False,
            download_name=image.get('filename', 'image')
        )
    except Exception as e:
        print(f"Error retrieving image: {e}")
        return jsonify({'error': 'Failed to retrieve image'}), 500

@images_bp.route('/<image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(image_id):
    user_id = get_jwt_identity()

    image = Image.find_by_id(image_id)

    if not image:
        return jsonify({'error': 'Image not found'}), 404


    if image.get('uploaded_by') != user_id:
        return jsonify({'error': 'You do not have permission to delete this image'}), 403

    success = Image.delete(image_id)

    if not success:
        return jsonify({'error': 'Failed to delete image'}), 500

    return jsonify({'message': 'Image deleted successfully'})

@images_bp.route('/note/<note_id>', methods=['GET'])
def get_images_by_note(note_id):
    images = Image.find_by_note(note_id)

    return jsonify({
        'images': [Image.to_json(img) for img in images]
    })
