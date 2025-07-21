from flask import Flask, render_template, url_for

app = Flask(__name__)

@app.route("/")
def hello():
    # Pass static URLs to the template for use in JavaScript and CSS
    image_urls = {
        "DJI_0633": url_for('static', filename='images/DJI_0633.JPG'),
        "img": url_for('static', filename='images/img.jpg'),
        "img2": url_for('static', filename='images/img2.jpg'),
        "fort_york": url_for('static', filename='images/fort_york.jpg'),
        "cn_tower_pdf": url_for('static', filename='docs/CN_Tower.pdf'),
        "background_image": url_for('static', filename='images/background_image.jpg'),
        "DJI_0639": url_for('static', filename='images/DJI_0639.JPG'),  # Add DJI_0639
    }
    return render_template("index.html", image_urls=image_urls)
