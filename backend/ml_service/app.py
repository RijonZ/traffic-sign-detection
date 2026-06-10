import os
import io
import base64
import numpy as np
from flask import Flask, request, jsonify
from PIL import Image
import tensorflow as tf

app = Flask(__name__)

MODEL_PATH = os.environ.get(
    "ML_MODEL_PATH",
    "C:/Users/rijon/Documents/GitHub/traffic-sign-detection-ipynb/saved_models/best_traffic_sign_model.keras",
)

CLASS_NAMES = {
    0:  ("Speed Limit 20km/h",                   "Regulatory"),
    1:  ("Speed Limit 30km/h",                   "Regulatory"),
    2:  ("Speed Limit 50km/h",                   "Regulatory"),
    3:  ("Speed Limit 60km/h",                   "Regulatory"),
    4:  ("Speed Limit 70km/h",                   "Regulatory"),
    5:  ("Speed Limit 80km/h",                   "Regulatory"),
    6:  ("End of Speed Limit 80km/h",            "Regulatory"),
    7:  ("Speed Limit 100km/h",                  "Regulatory"),
    8:  ("Speed Limit 120km/h",                  "Regulatory"),
    9:  ("No Passing",                           "Prohibition"),
    10: ("No Passing for Heavy Vehicles",        "Prohibition"),
    11: ("Right of Way at Intersection",         "Warning"),
    12: ("Priority Road",                        "Regulatory"),
    13: ("Yield",                                "Regulatory"),
    14: ("Stop",                                 "Regulatory"),
    15: ("No Vehicles",                          "Prohibition"),
    16: ("Heavy Vehicles Prohibited",            "Prohibition"),
    17: ("No Entry",                             "Prohibition"),
    18: ("General Caution",                      "Warning"),
    19: ("Dangerous Left Curve",                 "Warning"),
    20: ("Dangerous Right Curve",                "Warning"),
    21: ("Double Curve",                         "Warning"),
    22: ("Bumpy Road",                           "Warning"),
    23: ("Slippery Road",                        "Warning"),
    24: ("Road Narrows on Right",                "Warning"),
    25: ("Road Work",                            "Warning"),
    26: ("Traffic Signals",                      "Warning"),
    27: ("Pedestrians",                          "Warning"),
    28: ("Children Crossing",                    "Warning"),
    29: ("Bicycles Crossing",                    "Warning"),
    30: ("Beware of Ice/Snow",                   "Warning"),
    31: ("Wild Animals Crossing",                "Warning"),
    32: ("End of All Restrictions",              "Regulatory"),
    33: ("Turn Right Ahead",                     "Regulatory"),
    34: ("Turn Left Ahead",                      "Regulatory"),
    35: ("Ahead Only",                           "Regulatory"),
    36: ("Go Straight or Right",                 "Regulatory"),
    37: ("Go Straight or Left",                  "Regulatory"),
    38: ("Keep Right",                           "Regulatory"),
    39: ("Keep Left",                            "Regulatory"),
    40: ("Roundabout Mandatory",                 "Regulatory"),
    41: ("End of No Passing",                    "Regulatory"),
    42: ("End of No Passing for Heavy Vehicles", "Regulatory"),
}

model = None


def load_model():
    global model
    print(f"Loading model from: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully.")


def preprocess(image_base64):
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Crop center square to preserve sign proportions before resize
    w, h = image.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    image = image.crop((left, top, left + side, top + side))

    image = image.resize((32, 32), Image.LANCZOS)
    arr = np.array(image, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "model_loaded": model is not None})


@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json(silent=True)
    if not data or "image_base64" not in data:
        return jsonify({"error": "image_base64 is required"}), 400

    try:
        input_arr = preprocess(data["image_base64"])
        predictions = model.predict(input_arr, verbose=0)
        class_id = int(np.argmax(predictions[0]))
        confidence = float(np.max(predictions[0])) * 100
        sign_name, category = CLASS_NAMES.get(class_id, ("Unknown Sign", "Unknown"))

        return jsonify({
            "sign": sign_name,
            "category": category,
            "confidence": round(confidence, 1),
            "class_id": class_id,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    load_model()
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"ML service running on port {port}")
    app.run(host="0.0.0.0", port=port)
