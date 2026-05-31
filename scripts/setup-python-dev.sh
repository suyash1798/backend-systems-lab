#!/usr/bin/env sh
set -e

python3 -m venv .venv

. .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install -r services/user-service/requirements.txt
python -m pip install -r services/lobby-service/requirements.txt
python -m pip install -r services/wallet-service/requirements.txt
python -m pip install -r services/analytics-service/requirements.txt

echo "Python dev environment ready."
echo "In VS Code, select interpreter: .venv/bin/python"
