// Synthetic fixed-case adaptation of the supplied probe. No MMKV source edits.
#include "MMKV.h"
#include <cstdio>
#include <cstdlib>
#include <string>
#include <fcntl.h>
#include <sys/resource.h>
#include <unistd.h>
using namespace mmkv;

static MMKV *openStore(bool readOnly) {
    auto mode = readOnly ? (MMKVMode)(MMKV_SINGLE_PROCESS | MMKV_READ_ONLY) : MMKV_SINGLE_PROCESS;
#ifdef MMKV_ANDROID
    return MMKV::mmkvWithID("mmkv.default", DEFAULT_MMAP_SIZE, mode);
#else
    return MMKV::mmkvWithID("mmkv.default", mode);
#endif
}

static void observe(MMKV *kv, const char *stage) {
    std::string root;
    bool found = kv->getString("persist:root", root);
    printf("%s root=%d rootBytes=%zu contains=%d keys=%zu size=%zu readOnly=%d nativeTotalSize=%zu\n",
           stage, found, root.size(), kv->containsKey("persist:root"),
           kv->allKeys().size(), kv->actualSize(), kv->isReadOnly(), kv->totalSize());
    fflush(stdout);
}

int main(int argc, char **argv) {
    if (argc != 3) return 2;
    std::string mode = argv[1], dir = argv[2];
    struct rlimit cores = {0, 0};
    setrlimit(RLIMIT_CORE, &cores);
    MMKV::initializeMMKV(dir, MMKVLogNone);
    if (mode.rfind("seed", 0) == 0) {
        MMKV *kv = openStore(false);
        if (!kv) return 3;
        if (mode == "seed") {
            if (!kv->set(std::string(5000, 'w'), "persist:root")) return 6;
            if (!kv->set(std::string(300, 'l'), "persist:logs")) return 6;
        } else if (mode == "seed-logs") {
            if (!kv->set(std::string(300, 'l'), "persist:logs")) return 6;
        } else if (mode == "seed-deleted") {
            if (!kv->set(std::string(5000, 'w'), "persist:root")) return 6;
            kv->removeValueForKey("persist:root");
            observe(kv, "seed-deleted");
        } else if (mode == "seed-canonical-empty") {
            observe(kv, "seed-inspected");
        }
        kv->sync();
        kv->close();
        puts("seeded");
        return 0;
    }
    bool starve = mode.find("nofd") != std::string::npos;
    struct rlimit original;
    if (getrlimit(RLIMIT_NOFILE, &original)) return 4;
    if (starve) {
        auto low = original;
        low.rlim_cur = mode.find("nofd4") != std::string::npos ? 4 : 3;
        if (setrlimit(RLIMIT_NOFILE, &low)) return 4;
    }
    MMKV *kv = openStore(mode.rfind("ro", 0) == 0);
    printf("constructed=%d\n", kv != nullptr);
    fflush(stdout);
    if (!kv) return 5;
    observe(kv, "first");
    if (starve) {
        if (setrlimit(RLIMIT_NOFILE, &original)) return 4;
        int fd = open((dir + "/mmkv.default").c_str(), O_RDONLY);
        printf("fault-cleared plainOpen=%d cachedInstance=%d\n", fd >= 0, openStore(false) == kv);
        if (fd >= 0) close(fd);
        observe(kv, "retry");
    }
    fflush(stdout);
    _exit(0);
}
