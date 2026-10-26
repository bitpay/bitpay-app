#include "../../node_modules/react-native-mmkv/cpp/LegacyInstanceGuard.h"
#include <cassert>
#include <string>

// Compile the exact shipped guard. Separate invocations model actual process
// lifetime; this does not substitute for MMKV/device integration evidence.
int main(int argc, char** argv) {
  using facebook::react::legacyInstanceGuard;
  assert(argc == 2);
  if (std::string(argv[1]) == "opened") {
    assert(legacyInstanceGuard.open());
    assert(!legacyInstanceGuard.claimRetirement());
    // A recreated TurboModule accesses the same process-wide guard.
    assert(!facebook::react::legacyInstanceGuard.claimRetirement());
  } else {
    assert(legacyInstanceGuard.claimRetirement());
    assert(legacyInstanceGuard.claimRetirement());
    assert(!legacyInstanceGuard.open());
  }
}
