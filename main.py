from flask import Flask
from flask import render_template
from flask import request
from flask import jsonify
from flaskwebgui import FlaskUI
import requests
import json
import concurrent.futures
import multiprocessing
import sys
import logging

# Set to "False" when debugging then
# it will output to the terminal

IN_APP_LOGS = True

class OutputCapturer:
    output = []

    def __enter__(self):
        self._stdout = sys.stdout
        self._stderr = sys.stderr
        sys.stdout = self
        sys.stderr = self
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout = self._stdout
        sys.stderr = self._stderr

    def write(self, text):
        self.output.append(text)

    def flush(self):
        pass

app = Flask(__name__)

try:
    with open('nanabox.json', 'r') as file:
        json_file = json.load(file)
except (FileNotFoundError, json.JSONDecodeError):
    json_file = {
        "hosts": {
    "fileio": {
        "url": "https://file.io",
        "link": "lambda data: data['link']"
    },
    "anon": {
        "url": "https://api.anonfiles.com/upload",
        "link": "lambda data: data['data']['file']['url']['short']"
    },
    "filechan": {
        "url": "https://api.filechan.org/upload",
        "link": "lambda data: data['data']['file']['url']['short']"
    },
    "myfile": {
        "url": "https://api.myfile.is/upload",
        "link": "lambda data: data['data']['file']['url']['short']"
    },
    "bay": {
        "url": "https://api.bayfiles.com/upload",
        "link": "lambda data: data['data']['file']['url']['short']"
    },
    "letsupload": {
        "url": "https://api.letsupload.cc/upload",
        "link": "lambda data: data['data']['file']['url']['short']"
    }
},
        "history": {}
    }

def fileio(data):
    return data["link"]

hosts = json_file["hosts"]

def evaluate_function_string(func_str):
    def dynamic_function(data):
        return eval(func_str)
    return dynamic_function

for key, value in hosts.items():
    if isinstance(value, str):
        hosts[key] = evaluate_function_string(value)

@app.route('/')
def home():
    return render_template('index.html')

# GET | Backend logs

@app.route('/logs')
def send_logs():
    filtered_output = [line.decode() if isinstance(line, bytes) else line for line in OutputCapturer.output if line.strip()]
    return jsonify({'output': filtered_output})

# POST | Upload file(s)

def upload_file(url, file):
    with requests.post(url, files={'file': (file.filename, file.read())}) as response:
        return response.json()

@app.route('/upload', methods=['POST'])
def upload():
    try:
        if 'file' not in request.files:
            print("[ERROR] No file provided")
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            print("[ERROR] No file selected")
            return jsonify({"error": "No file selected"}), 400
        
        host = hosts.get(request.args.get('host'))
        url = host['url']

        if not url:
            print("[ERROR] Invalid host!")
            return jsonify({"error": "Invalid host"}), 400

        result_queue = multiprocessing.Queue()

        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(upload_file, url, file)
            future.add_done_callback(lambda future: result_queue.put(future.result()))

        data = result_queue.get()
        print("[SUCCESS] DATA RECEIVED: " + json.dumps(data))

        file_link_fn_str = host['link']
        file_link = eval(file_link_fn_str)(data)
        file_name = file.filename

        json_file["history"][file_name] = file_link

        with open('nanabox.json', 'w') as file:
            json.dump(json_file, file)

        return jsonify({
            "Link": file_link
        })
    except Exception as err:
        print(str(err))
        return jsonify({
            "error": "Host may be down! (check logs for more info)"
        })

# POST | Add host

@app.route('/add-host/<name>', methods=['POST'])
def addHost(name):
    try:
        data = request.json
        json_file["hosts"][name] = data.get('get_link_from_json')

        with open('nanabox.json', 'w') as file:
            json.dump(json_file, file)
    except Exception as err:
        print(str(err))
        return jsonify({
            "error": "Failed to add host!"
        })

# GET | Upload history

@app.route('/history', methods=['GET'])
def send_history():
    try:
        with open('nanabox.json', 'r') as file:
            data = json.load(file)
        return jsonify(data["history"])
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify(["error"]), 404

# POST | Clear file upload history

@app.route('/clear', methods=['DELETE'])
def clear_history():
    with open('nanabox.json', 'r+') as file:
        data = json.load(file)
        data["history"] = {}
        file.seek(0)
        json.dump(data, file)
        file.truncate()

    return jsonify({"success": True})

# GET | Array of all hosts

@app.route('/hosts', methods=['GET'])
def send_hosts():
    return jsonify(list(hosts.keys()))

if __name__ == '__main__':
    if (IN_APP_LOGS):
        app.logger.addHandler(logging.StreamHandler(sys.stderr))
        app.logger.setLevel(logging.INFO)

        with OutputCapturer() as capturer:
            # app.run(debug=True)
            FlaskUI(app=app, server="flask", width=400, height=500).run()
    else:
        # app.run(debug=True)
        FlaskUI(app=app, server="flask", width=400, height=500).run()
