import os
import tempfile

os.environ.setdefault("PTW_DATA_DIR", tempfile.mkdtemp(prefix="ptw-test-"))
os.environ["PTW_SEED"] = "0"
