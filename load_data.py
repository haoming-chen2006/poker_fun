import kagglehub
from roboflow import Roboflow
rf = Roboflow(api_key="pl3LdkBxkNKTvgQzBHwK")
project = rf.workspace("haoming").project("poker-j2pzb-1g75g")
version = project.version(1)
dataset = version.download("yolov8")
# Download latest version
path = kagglehub.dataset_download("andy8744/playing-cards-object-detection-dataset")

print("Path to dataset files:", path)

data_path = "Users/haoming/.cache/kagglehub/datasets/andy8744/playing-cards-object-detection-dataset/versions/4"

