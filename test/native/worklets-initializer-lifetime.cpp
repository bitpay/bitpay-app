// Isolated lifetime test, not a React Native/Hermes integration test.
// The runner substitutes the installed class verbatim at the marker below.
// Only its JSI/base-object dependencies and cleanup observer are test doubles.
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <mutex>
#include <new>

namespace jsi {
struct Runtime {};
struct Object {};
struct Value {};
} // namespace jsi

static int liveInitializers = 0;
static int cleanupCalls = 0;

class Serializable {
 public:
  enum class ValueType { HandleType };
  explicit Serializable(ValueType) {}
  virtual ~Serializable() = default;
  virtual jsi::Value toJSValue(jsi::Runtime &) = 0;
};

class SerializableObject {
 public:
  SerializableObject(jsi::Runtime &, const jsi::Object &) { ++liveInitializers; }
  ~SerializableObject() { --liveInitializers; }
};

static void cleanupRuntimeAware(jsi::Runtime *runtime, std::unique_ptr<jsi::Value> &value) {
  if (runtime != nullptr || value != nullptr) std::abort();
  ++cleanupCalls;
}

// Expose only the tested member for a byte-representation check. No constructor
// or destructor code is changed. Check before destruction so the negative case
// fails without evaluating an indeterminate pointer as a C++ pointer value.
#define private public
// SERIALIZABLE_INITIALIZER_FROM_INSTALLED_HEADER
#undef private

jsi::Value SerializableInitializer::toJSValue(jsi::Runtime &) {
  std::abort(); // This regression must never materialize the initializer.
}

int main() {
  jsi::Runtime runtime;
  jsi::Object initializerObject;
  jsi::Runtime *nullRuntime = nullptr;
  for (int iteration = 0; iteration < 1000; ++iteration) {
    alignas(SerializableInitializer) unsigned char storage[sizeof(SerializableInitializer)];
    // Nonzero storage prevents zero-filled allocations from masking the bug.
    std::memset(storage, 0xa5, sizeof(storage));
    auto *initializer = new (storage) SerializableInitializer(runtime, initializerObject);
    if (std::memcmp(&initializer->remoteRuntime_, &nullRuntime, sizeof(nullRuntime)) != 0) {
      std::fputs("remoteRuntime_ was not initialized to nullptr\n", stderr);
      return 1;
    }
    if (liveInitializers != 1) return 2;
    initializer->~SerializableInitializer();
    if (liveInitializers != 0 || cleanupCalls != iteration + 1) return 3;
  }
  std::puts("1000 unmaterialized initializer construction/destruction cycles passed");
}
