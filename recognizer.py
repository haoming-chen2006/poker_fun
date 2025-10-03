from ultralytics import YOLO

# Load a model
# model = YOLO("yolov8n.yaml")  # build a new model from scratch
model = YOLO("./yolov8s_playing_cards.pt")  # load a pretrained model (recommended for training)

# Use the model
# results = model.train(data="coco128.yaml", epochs=3)  # train the model
# results = model.val()  # evaluate model performance on the validation set



model.train(
    data="/Users/haoming/Desktop/Poker Recognizer/poker-1/data.yaml",
    epochs=5,
    project="PokerRuns",
    name="exp1"
)



results = model("/Users/haoming/Desktop/Poker Recognizer/data_config/test.jpg")  # predict on an image
# success = YOLO("yolov8n.pt").export(format="onnx")  # export a model to ONNX format

# Get the first result
result = results[0]

# Get predictions and confidence scores
boxes = result.boxes
if boxes is not None:
    # Get class names, confidence scores, and bounding boxes
    class_ids = boxes.cls.cpu().numpy()  # Class IDs
    confidences = boxes.conf.cpu().numpy()  # Confidence scores
    coordinates = boxes.xyxy.cpu().numpy()  # Bounding box coordinates [x1, y1, x2, y2]
    
    # Get class names from the model
    class_names = [result.names[int(cls_id)] for cls_id in class_ids]
    
    print(f"\nDetections found: {len(class_ids)}")
    print("-" * 50)
    
    for i in range(len(class_ids)):
        print(f"Detection {i+1}:")
        print(f"  Class: {class_names[i]}")
        print(f"  Confidence: {confidences[i]:.3f}")
        print(f"  Bounding Box: [{coordinates[i][0]:.1f}, {coordinates[i][1]:.1f}, {coordinates[i][2]:.1f}, {coordinates[i][3]:.1f}]")
        print()
else:
    print("No detections found")
    
    # Attributes:
    #     orig_img (np.ndarray): The original image as a numpy array.
    #     orig_shape (tuple[int, int]): Original image shape in (height, width) format.
    #     boxes (Boxes | None): Detected bounding boxes.
    #     masks (Masks | None): Segmentation masks.
    #     probs (Probs | None): Classification probabilities.
    #     keypoints (Keypoints | None): Detected keypoints.
    #     obb (OBB | None): Oriented bounding boxes.
    #     speed (dict): Dictionary containing inference speed information.
    #     names (dict): Dictionary mapping class indices to class names.
    #     path (str): Path to the input image file.
    #     save_dir (str | None): Directory to save results.

    # Methods:
    #     update: Update the Results object with new detection data.
    #     cpu: Return a copy of the Results object with all tensors moved to CPU memory.
    #     numpy: Convert all tensors in the Results object to numpy arrays.
    #     cuda: Move all tensors in the Results object to GPU memory.
    #     to: Move all tensors to the specified device and dtype.
    #     new: Create a new Results object with the same image, path, names, and speed attributes.
    #     plot: Plot detection results on an input RGB image.
    #     show: Display the image with annotated inference results.
    #     save: Save annotated inference results image to file.
    #     verbose: Return a log string for each task in the results.
    #     save_txt: Save detection results to a text file.
    #     save_crop: Save cropped detection images to specified directory.
    #     summary: Convert inference results to a summarized dictionary.
    #     to_df: Convert detection results to a Polars Dataframe.
    #     to_json: Convert detection results to JSON format.
    #     to_csv: Convert detection results to a CSV format.

    # Examples:
    #     >>> results = model("path/to/image.jpg")
    #     >>> result = results[0]  # Get the first result
    #     >>> boxes = result.boxes  # Get the boxes for the first result
    #     >>> masks = result.masks  # Get the masks for the first result
    #     >>> for result in results:
    #     >>>     result.plot()  # Plot detection results