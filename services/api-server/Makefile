ALLURE_RESULTS_DIR := test-results/allure
ALLURE_REPORT_DIR := test-results/allure-report
COVERAGE_DIR := test-results/coverage
COVERAGE_PROFILE := $(COVERAGE_DIR)/e2e.out
COVERAGE_HTML := $(COVERAGE_DIR)/e2e.html

.PHONY: allure-report test-e2e clean

allure-report:
	allure generate $(ALLURE_RESULTS_DIR) --clean -o $(ALLURE_REPORT_DIR)
	allure open $(ALLURE_REPORT_DIR)

test-e2e:
	rm -rf $(ALLURE_RESULTS_DIR)
	mkdir -p $(ALLURE_RESULTS_DIR) $(COVERAGE_DIR)
	go test ./tests/e2e \
		-v \
		-count=1 \
		-covermode=atomic \
		-coverpkg=./internal/...,./pkg/... \
		-coverprofile=$(COVERAGE_PROFILE)
	go tool cover -func=$(COVERAGE_PROFILE)
	go tool cover -html=$(COVERAGE_PROFILE) -o $(COVERAGE_HTML)
	go tool cover -func=$(COVERAGE_PROFILE) | awk '/^total:/ {print "total_coverage: " $$3}' >> $(ALLURE_RESULTS_DIR)/environment.properties
	allure serve $(ALLURE_RESULTS_DIR)

clean:
	rm -rf $(ALLURE_RESULTS_DIR) $(ALLURE_REPORT_DIR) $(COVERAGE_DIR)
