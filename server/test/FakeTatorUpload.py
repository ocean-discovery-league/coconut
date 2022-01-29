#!/usr/bin/python3

import logging
import sys
import time
logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    for progress in [10, 20, 30, 40, 50]:
        logger.info(f"Upload progress: {progress}%")
        #sys.stdout.flush();
        time.sleep(1)

