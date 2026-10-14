import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY_PATH = ROOT / "docs/marketing/marketing-capability-registry.json"
VALIDATOR_PATH = ROOT / "scripts/marketing/validate_registry.py"

spec = importlib.util.spec_from_file_location("validate_registry", VALIDATOR_PATH)
validator = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(validator)


class MarketingRegistryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))

    def test_baseline_registry_is_valid(self):
        self.assertEqual([], validator.validate(self.registry))

    def test_duplicate_ids_fail_closed(self):
        data = json.loads(json.dumps(self.registry))
        data["capabilities"].append(dict(data["capabilities"][0]))
        self.assertTrue(any("duplicate capability id" in e for e in validator.validate(data)))

    def test_operational_without_live_evidence_is_rejected(self):
        data = json.loads(json.dumps(self.registry))
        data["capabilities"][0]["status"] = "operational"
        errors = validator.validate(data)
        self.assertTrue(any("missing evidence.runtime_smoke" in e for e in errors))

    def test_tested_without_ci_evidence_is_rejected(self):
        data = json.loads(json.dumps(self.registry))
        data["capabilities"][0]["status"] = "tested"
        errors = validator.validate(data)
        self.assertTrue(any("missing evidence.test_run" in e for e in errors))

    def test_unknown_status_is_rejected(self):
        data = json.loads(json.dumps(self.registry))
        data["capabilities"][0]["status"] = "PROVEN"
        self.assertTrue(any(".status must be one of" in e for e in validator.validate(data)))


if __name__ == "__main__":
    unittest.main()
