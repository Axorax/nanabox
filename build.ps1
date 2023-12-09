pyinstaller --name "nanabox" --onefile --paths env\Lib\site-packages --add-data "static;static" --add-data "templates;templates" main.py --noconsole --icon static\nanabox.ico
