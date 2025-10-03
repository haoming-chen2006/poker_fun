from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO
import base64
from io import BytesIO
from PIL import Image
from sklearn.cluster import DBSCAN

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the YOLO model
model = YOLO("./yolov8s_playing_cards.pt")

def get_bbox_center(bbox):
    """Calculate center point of bounding box"""
    x1, y1, x2, y2 = bbox
    return [(x1 + x2) / 2, (y1 + y2) / 2]

def merge_duplicate_cards(detections):
    """Merge detections with same card label, keeping highest confidence"""
    card_map = {}

    for detection in detections:
        card = detection['card']
        if card not in card_map:
            card_map[card] = detection
        else:
            # Keep the one with higher confidence
            if detection['confidence'] > card_map[card]['confidence']:
                card_map[card] = detection

    return list(card_map.values())

def cluster_cards_into_hands(detections, num_players):
    """Cluster detected cards into player hands based on spatial proximity"""
    if len(detections) == 0:
        return []

    # Get centers of all bounding boxes
    centers = np.array([get_bbox_center(d['bbox']) for d in detections])

    # Use DBSCAN clustering - automatically groups nearby cards
    # eps is the maximum distance between cards in the same hand
    # Adjust based on your camera setup and table size
    clustering = DBSCAN(eps=150, min_samples=1).fit(centers)
    labels = clustering.labels_

    # Group detections by cluster
    hands = {}
    for i, label in enumerate(labels):
        if label not in hands:
            hands[label] = []
        hands[label].append(detections[i])

    # Sort hands by average y-position (top to bottom) or x-position
    sorted_hands = []
    for cluster_id, cards in hands.items():
        avg_position = np.mean([get_bbox_center(c['bbox']) for c in cards], axis=0)
        sorted_hands.append({
            'hand_id': cluster_id,
            'cards': cards,
            'position': avg_position.tolist(),
            'card_count': len(cards)
        })

    # Sort by position (you can customize this - by x, y, or both)
    sorted_hands.sort(key=lambda h: (h['position'][1], h['position'][0]))

    # Reassign hand IDs based on position (Player 1, Player 2, etc.)
    for idx, hand in enumerate(sorted_hands):
        hand['player_id'] = idx + 1

    return sorted_hands

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get the image from the request
        data = request.get_json()
        image_data = data['image']
        num_players = data.get('num_players', 2)  # Default 2 players

        # Decode base64 image - remove data:image/jpeg;base64, prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)

        # Convert to PIL Image then to numpy array
        image = Image.open(BytesIO(image_bytes))
        image_np = np.array(image)

        # Run YOLO prediction
        results = model(image_np)
        result = results[0]

        # Extract predictions
        detections = []
        if result.boxes is not None:
            boxes = result.boxes
            class_ids = boxes.cls.cpu().numpy()
            confidences = boxes.conf.cpu().numpy()
            coordinates = boxes.xyxy.cpu().numpy()

            for i in range(len(class_ids)):
                detection = {
                    'card': result.names[int(class_ids[i])],
                    'confidence': float(confidences[i]),
                    'bbox': coordinates[i].tolist(),
                    'timestamp': None  # Will be set on frontend
                }
                detections.append(detection)

        # Step 1: Merge duplicate cards (same label)
        merged_detections = merge_duplicate_cards(detections)

        # Step 2: Cluster cards into hands
        hands = cluster_cards_into_hands(merged_detections, num_players)

        return jsonify({
            'success': True,
            'detections': merged_detections,
            'hands': hands,
            'count': len(merged_detections)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
