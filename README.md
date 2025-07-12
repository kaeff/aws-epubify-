# aws-epubify

Web application that converts AWS documentation to epub. provide your link to the index of the documentation you want to convert, and after a short while, your epub file will be ready for download. Your epub will contain all subpages as chapters, and has all images embedded.

Used [PyWebDoc2Epub](https://github.com/brignoni/py-webdoc-2-ebook) for the conversion. Backend is implemented using FastAPI, frontend is React, Celery for background worker (epub processing)