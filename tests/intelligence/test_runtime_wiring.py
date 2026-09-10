import os
import unittest

from intelligence.mission.runtime import build_openai_mission_engine


class RuntimeWiringTests(unittest.TestCase):
    def test_runtime_wiring_fails_closed_without_secret(self):
        previous = os.environ.pop("OPENAI_API_KEY", None)
        try:
            with self.assertRaises(RuntimeError):
                build_openai_mission_engine()
        finally:
            if previous is not None:
                os.environ["OPENAI_API_KEY"] = previous


if __name__ == "__main__":
    unittest.main()
