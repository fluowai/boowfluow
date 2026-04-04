import sys
import os
import json
from faster_whisper import WhisperModel

# Configuração do modelo (base é rápido e preciso para Português)
# Se você tiver GPU, mude device para "cuda"
model_size = "base"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

def transcribe(file_path):
    try:
        if not os.path.exists(file_path):
            return {"error": "Arquivo não encontrado"}

        segments, info = model.transcribe(file_path, beam_size=5, language="pt")
        
        full_text = ""
        for segment in segments:
            full_text += segment.text + " "

        return {
            "text": full_text.strip(),
            "language": info.language,
            "probability": info.language_probability
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Caminho do arquivo ausente"}))
    else:
        path = sys.argv[1]
        result = transcribe(path)
        print(json.dumps(result))
