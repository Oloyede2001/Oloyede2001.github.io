(function($, window) {
  var SlurmOMatic = {
    init: function() {
      this.renderUI();
    },
    renderUI: function() {
      handleGPU(null);
      var config = {};
      var i;
      var j;
      var queueLength;
      var resourceTable = $("#resource-table");

      $.getJSON("includes/config.json", function(data) {
        config = data;
        queueLength = config.queues.length;
        populateFakeGpu(config);

        queueLength = config.queues.length;
        populateResourceTable(config);
        populateQueueRadio(config);
        populateGpuRadio(config);
        populateModules(config);
        populateResourceDropdowns(config);
        populateTimeDropdowns();
        startupCheckSession();
        generateScript();
        bindEvents();
        return;
      }).fail(function(e) {
        console.log("An error has occurred.", e);
      });

      function populateResourceTable(config) {
        var $tableBody = $('#resource-table tbody');
        $tableBody.empty();
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].showTable) {
            var tableRow = $('<tr>');
            $("<td>").html(config.queues[i].name).appendTo(tableRow);
            $("<td>").html(config.queues[i].cpu).appendTo(tableRow);
            $("<td>").html(config.queues[i].memory).appendTo(tableRow);
            $("<td>").html(config.queues[i].displayNodes).appendTo(tableRow);
            $("<td>").html(config.queues[i].gpus).appendTo(tableRow);
            $tableBody.append(tableRow);
          }
          collapseResourceTableSession();
        }
      }

      function collapseResourceTableSession() {
        var tableToggle = checkSession('table-toggle');
        var tableToggleIcon = $('.table-toggle i');
        var showIcon = "fa-plus";
        var hideIcon = "fa-minus";
        if (tableToggle == "collapsed") {
          resourceTable.hide();
          tableToggleIcon.addClass(showIcon).removeClass(hideIcon);
        } else {
          resourceTable.show();
          tableToggleIcon.addClass(hideIcon).removeClass(showIcon);
        }
      }

      function populateQueueRadio(config) {
        var sessionRadio = checkSession('queue_radio');
        var $queueList = $('#choose-queue');
        $queueList.empty();
        const uniqueArr = [];
        for (i = 0; i < queueLength; i++) {
          if (uniqueArr.indexOf(config.queues[i].name) === -1) {
            uniqueArr.push(config.queues[i].name);
          }
        }

        for (i = 0; i < uniqueArr.length; i++) {
          var queueRow = $('<div class="form-check">');
          var queueRadio = $('<input type="radio" class="queue_radio form-check-input" name="queue">');
          var radioValue = uniqueArr[i];
          var radioId = radioValue.replace(/\s+/g, '-').toLowerCase();
          queueRadio.val(radioValue);
          queueRadio.prop('id', radioId + i);
          if (radioValue == sessionRadio) {
            queueRadio.prop('checked', true);
          }
          queueRadio.appendTo(queueRow);
          $('<label class="form-check-label mt-2">').prop('for', radioId + i).html(uniqueArr[i]).appendTo(queueRow);
          $queueList.append(queueRow);
        }
        if (!sessionRadio) {
          $('#choose-queue .queue_radio').first().prop("checked", true);
        }
      }

      function populateResourceDropdowns(config) {
        var queue = $('.queue_radio:checked').val();
        handleGPU(queue);
        var gpuSpec = $('.gpu-flag-radio:checked').val();
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].name == queue) {
            if (config.queues[i].name == "gpu") {
              if (config.queues[i].gpuId != gpuSpec) {
                continue;
              }
            }
            var cpuLimit = config.queues[i].coresLimit;
            var cpuCount = config.queues[i].cores;
            populateCores(cpuCount, cpuLimit);

            var memory = config.queues[i].memoryNum;
            populateMemory(memory);
            var nodeCount = config.queues[i].nodes;
            populateNodes(nodeCount);
            if (config.queues[i].name == "gpu") {
              var gpuNumber = config.queues[i].gpuNumber;
              populateGpus(gpuNumber);
            }
          }
        }
      }

      function populateGpus(gpus) {
        var gpuTarget = $('#gpu');
        var gpuSpan = $('#gpuRange');
        gpuTarget.empty();
        for (j = 1; j <= gpus; j++) {
          gpuTarget.append('<option value="' + j + '">' + j + '</option>');
        }
        gpuSpan.text(" up to " + gpus);
      }

      function populateCores(cores, limit) {
        var cpu = $('#cpu');
        var cpuSpan = $('#coreRange');
        cpu.empty();
        for (j = 1; j <= cores; j++) {
          cpu.append('<option value="' + j + '">' + j + '</option>');
        }
        cpuSpan.text(" up to " + cores);
        var cpuHelp = $('#cpuHelp');
        if (limit) {
          $('#cpuHelp').text("limit of " + limit + " CPUs per node");
        }
      }

      function populateNodes(nodes) {
        var $nodes = $('#nodes');
        var nodeSpan = $('#nodeRange');
        $nodes.empty();
        for (j = 1; j <= nodes; j++) {
          $nodes.append('<option value="' + j + '">' + j + '</option>');
        }
        nodeSpan.text(" up to " + nodes);
      }

      function populateMemory(memory) {
        var $memory = $('#memory');
        $memory.empty();
        $memory.append('<option value="' + "500M" + '">.5 (500MB)</option>');
        for (j = 1; j <= config.queues[i].memoryNum; j++) {
          $memory.append('<option value="' + j + 'G">' + j + '</option>');
        }
        $($memory).val("1G");
      }

      function populateGpuRadio(config) {
        // Check the session
        var sessionRadio = checkSession('gpu_radio');
        var $gpugroup = $('#choose-gpu');
        $gpugroup.empty();
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].gpus && config.queues[i].name !== "gpu") {  // Exclude the generic "gpu" queue
            var gpuFlagRow = $('<div class="form-check"></div>');
            var gpuFlagRadio = $('<input type="radio" class="form-check-input gpu-flag-radio" name="gpuFlag">');
            var radioValue = config.queues[i].gpuId
            gpuFlagRadio.val(radioValue);
            var gpuFlagRadioId = radioValue.replace(/\s+/g, '-').toLowerCase();
            if (radioValue == sessionRadio) {
              gpuFlagRadio.prop('checked', true);
            }
            gpuFlagRadio.attr("data-flag", config.queues[i].gpuFlag).prop('id', gpuFlagRadioId + i);
            gpuFlagRadio.appendTo(gpuFlagRow);
            $('<label class="form-check-label mt-2">').prop('for', gpuFlagRadioId + i).html(config.queues[i].gpus).appendTo(gpuFlagRow);
            $gpugroup.append(gpuFlagRow);
          }
        }
      }
      
      function populateFakeGpu(config) {
        var $gpugroup = $('#choose-gpu');
        var minNodes = 0;
        var minMem = 0;
        var minCores = 0;
        var minCoresLim = 0;
        var minGpu = 0;
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].gpuFlag) {
            var minNodesTest = config.queues[i].nodes;
            var minMemTest = config.queues[i].memoryNum;
            var minCoresLimTest = config.queues[i].coresLimit;
            var minCoresTest = config.queues[i].cores;
            var minGpuTest = config.queues[i].gpuNumber;
            if (minCores < minCoresTest) {
              minCores = minCoresTest;
            }
            if (minNodes < minNodesTest) {
              minNodes = minNodesTest;
            }
            if (minCoresLim < minCoresLimTest) {
              minCoresLim = minCoresLimTest;
            }
            if (minGpu < minGpuTest) {
              minGpu = minGpuTest;
            }
            if (minMem < minMemTest) {
              minMem = minMemTest;
            }
          }
        }
        config.queues.push({
          "name": "gpu",
          "gpus": "No preference",
          "gpuId": "None",
          "memoryNum": minMem,
          "nodes": minNodes,
          "gpuNumber": minGpu,
          "cores": minCores,
          "coresLimit": minCoresLim
        });
      }

      function handleGPU(queue) {
        if (queue.includes("gpu")) {
          $('.gpu-group').show();
      
          if ($(".gpu-flag-radio:checked").length == 0) {
            // Select the last radio, so the user doesn't see a bunch of nonsense in the script box
            $('#choose-gpu .gpu-flag-radio').last().prop("checked", true);
            populateResourceDropdowns(config);
          }
      
        } else { // Unselect/dump GPU options
          $(".gpu-group").hide();
          $(".gpu-flag-radio").prop('checked', false);
          var $gpus = $('#gpu');
          $gpus.empty();
        }
      }
      

      async function copyTextToClipboard(text) {
        try {
          await navigator.clipboard.writeText(text);
          notifyCopy();
        } catch (err) {
          console.error('Failed to copy: ', err);
        }
      }

      function notifyCopy() {
        baseWidth = $('#copyBtn').width();
        $('#copyBtn').width(baseWidth);
        copyBling();
        setTimeout(function() {
          copyUnBling();
        }, 1000);
      }

      function copyBling() {
        $('#copyBtn').addClass('funkytown');
        $('.fancy-copy').addClass('copied');
        $('#copyBtn span').text(' Copied!');
        $('#copyBtn i').addClass('fa-beat');
        $('#copyBtn i').addClass('fa-solid fa-clipboard-check');
        $('#copyBtn i').removeClass('fa-regular fa-clipboard');
      }

      function copyUnBling() {
        $('#copyBtn').removeClass('funkytown');
        $('.fancy-copy').removeClass('copied');
        $('#copyBtn span').text(' Copy to Clipboard');
        $('#copyBtn i').removeClass('fa-beat');
        $('#copyBtn i').removeClass('fa-solid fa-clipboard-check');
        $('#copyBtn i').addClass('fa-regular fa-clipboard');
      }

      function generateScript() {
        var queue = $('.queue_radio:checked').val();
        var queueStr = "#SBATCH --partition " + queue + "\n";

        var cpu = getFancyDropdown('#cpu');
        var memory = getFancyDropdown('#memory');
        var nodes = getFancyDropdown('#nodes');
        var runtimeDays = getFancyDropdown('#runtimeDays');
        var runtimeHour = getFancyDropdown('#runtimeHr');
        var runtimeMinute = getFancyDropdown('#runtimeMin');
        var runtimeFormat = runtimeDays + "-" + runtimeHour + ":" + runtimeMinute + ":00";
        var gpu = $("#gpu").val();
        var cpuStr = "#SBATCH --ntasks " + cpu + "\n";
        var memStr = "#SBATCH --mem=" + memory + "\n";
        var nodesStr = "#SBATCH --nodes " + nodes + "\n";
        var runtimeString = "# Define how long the job will run d-hh:mm:ss\n#SBATCH --time " + runtimeFormat + "\n";
        var gpuStr = gpu ? "#SBATCH --gres=gpu:" + gpu + "\n" : "";
        var gpuFlagStr = "";
        var gpuFlag = $('.gpu-flag-radio:checked').attr("data-flag");
        if (gpuFlag) {
          gpuFlagStr = gpuFlag + "\n";
        }

        var modules;
        if ($('#modules').hasClass("select2-hidden-accessible")) {
          modules = $('#modules').select2('val');
        } else {
          $('#modules').select2({
            theme: 'bootstrap4',
            width: 'resolve',
            multiple: true
          });
          modules = $('#modules').select2('val');
        }

        var modulesStr = "";
        if (modules != null) {
          for (i = 0; i < modules.length; i++) {
            modulesStr += "module load " + modules[i].replace(/\(default\)/, "") + "\n";
          }
        }

        var commands = $('#commands').val();
        var commandsStr = commands + "\n";

        var sunetid = $('#sunetid').val();
        var jobname = $('#jobname').val();
        var workingdir = $('#workingdir').val();
        var email = sunetid + "@uc.edu";
        var emailStr = sunetid == "" ? "" : "# Get email notification when job finishes or fails\n#SBATCH --mail-user=" + email + "\n#SBATCH --mail-type=END,FAIL\n";
        var jobnameStr = jobname == "" ? "" : "# Give your job a name, so you can recognize it in the queue overview\n#SBATCH -J " + jobname + "\n";
        var workingdirStr = workingdir == "" ? "" : "#SBATCH -D " + workingdir + "\n";

        var stdout = $('#stdout').val();
        var stderr = $('#stderr').val();

        var stdoutStr = stdout == "" ? "" : "#SBATCH -o " + stdout + "\n";
        var stderrStr = stderr == "" ? "" : "#SBATCH -e " + stderr + "\n";

        var script = "#!/bin/bash\n" +
          "# ----------------SLURM Parameters----------------\n" +
          queueStr +
          gpuFlagStr +
          cpuStr +
          memStr +
          gpuStr +
          nodesStr +
          runtimeString +
          emailStr +
          jobnameStr +
          workingdirStr +
          stdoutStr +
          stderrStr +
          "# ----------------Load Modules--------------------\n" +
          modulesStr +
          "# ----------------Commands------------------------\n" +
          commandsStr;

        $('#slurm').height('auto').empty();
        $('#slurm').val(script);
        var slurmHeight = $('#slurm').height();
        var scroll = $('#slurm').prop('scrollHeight');
        if (slurmHeight != "auto") {
          if (scroll > slurmHeight) {
            $('#slurm').height(scroll + "px");
          }
        }

        populateNarrative(nodes, cpu, memory, runtimeDays, runtimeHour, runtimeMinute, gpu, queue, jobname, sunetid, stdout, stderr, workingdir);
        $('#workingdir').val(workingdir);
      }

      function populateNarrative(nodes, cpu, mem, days, hour, min, gpu, queue, jobname, sunetid, stdout, stderr, workingdir) {
        var narrative = $('#narrative');
        narrative.empty();
        var squeueString = "";
        var emailString = "";
        var outputString = "";
        var output = "";
        var jobHelpString = "";
        if (jobname) {
          jobname = " (" + jobname + ") ";
        }
        if (sunetid) {
          var email = sunetid + "@uc.edu";
          emailString = `<p>You will be notified at ${email} when the job ends or fails. </p>`;
          squeueString = "<code>squeue -u " + sunetid + "</code>";
          jobHelpString = `<p>After you have submitted this script, look for your job ${jobname} using the terminal command ${squeueString}</p>`;
        }
        if (workingdir) {
          workingdir += workingdir.endsWith("/") ? "" : "/";
          output = "in " + workingdir;
        }

        if (stdout) {
          stdout = workingdir + stdout;
          output = stdout;
        }

        if (stderr) {
          stderr = workingdir + stderr;
          if (stdout) {
            output = stdout + " and " + stderr;
          } else {
            output = stderr;
          }
        }
        if (output) {
          outputString = `<p>Your output files will be ${output}.</p>`;
        }

        if (nodes) {
          nodes = isOne(nodes, "node", "nodes");
        }
        if (cpu) {
          cpu = isOne(cpu, "CPU", "CPUs");
        }
        var gpuString = "";
        if (gpu) {
          gpu = isOne(gpu, "GPU", "GPUs");
          gpuString = gpu + ",";
        }
        var partitionString = "";
        if (queue) {
          partitionString = " on the " + queue + " partition.</p>";
        }
        var introString = "<p>This script requests ";
        var nodeString = nodes + ", ";
        var cpuString = "with " + cpu + ", ";
        var memString = " and " + mem + "B of memory ";

        var timeString = "";
        var timeIntroString = "<p>This job will run up to ";
        var dayString = "";
        var hourString = "";
        var minString = "";
        var hasMinutes = min > 0;
        var hasDays = days > 0;
        if (hasDays) {
          dayString = days + (days == 1 ? " day, " : " days, ");
        }
        if (hour) {
          if (hour != "00") {
            hour = hour.replace(/^0+/g, "");
            hour = isOne(hour, "hour", "hours");
            if (hasMinutes || hasDays) {
              hourString = hour + " and ";
            } else {
              hourString = hour + ".</p>";
            }
          } else {
            hourString = "";
          }
        }
        if (hasMinutes) {
          min = min.replace(/^0+/g, "");
          min = isOne(min, "minute", "minutes");
          minString = min + ".</p>";
        }

        narrative.empty();
        var narrativeString = introString +
          nodeString +
          cpuString +
          gpuString +
          memString +
          partitionString +
          timeString +
          timeIntroString +
          dayString +
          hourString +
          minString +
          outputString +
          emailString +
          jobHelpString;
        narrative.html(narrativeString);
      }

      function isOne(string, unit, unitPlural) {
        if (string == "1") {
          return "a single " + unit;
        } else {
          return string + " " + unitPlural;
        }
      }

      function hasClass(elem, className) {
        return elem.classList.contains(className);
      }

      function populateTimeDropdowns() {
        var runtimeMax = config.config.runtimeLimit;
        var runtimeMaxHour = config.config.runtimeLimit - 1;
        var runtimeDefault = 2;
        var display;
        var selectedString;

        var runtimeHr = $('#runtimeHr');
        runtimeHr.empty();
        for (j = 0; j <= runtimeMaxHour; j++) {
          selectedString = (j == runtimeDefault) ? " selected" : "";
          display = (j > 9) ? j : "0" + j;
          runtimeHr.append('<option value="' + display + '"' + selectedString + '>' + display + '</option>');
        }

        var runtimeMin = $('#runtimeMin');
        runtimeMin.empty();
        for (j = 0; j <= 59; j++) {
          display = (j > 9) ? j : "0" + j;
          runtimeMin.append('<option value="' + display + '">' + display + '</option>');
        }

        var runtimeDays = $('#runtimeDays');
        runtimeDays.empty();
        for (d = 0; d <= 20; d++) {
          selectedString = (d == 0) ? " selected" : "";
          runtimeDays.append('<option value="' + d + '"' + selectedString + '>' + d + '</option>');
        }

        var runMaxSpan = $('#runMax');
        runMaxSpan.text('Limit ' + runtimeMax + ' hours');

        $('.fancy-dropdown').select2({
          theme: 'bootstrap4',
          width: 'resolve',
        });
        $('.fancy-dropdown').on('select2:select', function(e) {
          generateScript();
          getSaveData(e.currentTarget);
        });
      }

      function populateModules(config) {
        var moduleSelect = $('#modules');
        moduleSelect.empty();
        var modListPath = config.config.apps_url;
        var sessionModules = checkSession('modules');
        var sessionModulesArray;
        if (sessionModules) {
          sessionModulesArray = sessionModules.split(",");
        }
        var selectedModule = "";
        const regex = new RegExp('^.*\/$');
        fetch(modListPath)
          .then(response => response.text())
          .then((data) => {
            $.each(data.split(/[\n\r]+/), function(index, line) {
              selectedModule = "";
              if (!regex.test(line)) {
                if ($.inArray(line, sessionModulesArray) != -1) {
                  selectedModule = "selected";
                }
                moduleSelect.append('<option ' + selectedModule + ' value="' + line + '">' + line + '</option>');
              }
            });
            $('#modules').select2({
              theme: 'bootstrap4',
              width: 'resolve',
              multiple: true
            });

            generateScript();
          });
      }

      $(document).on('input', '.autoresizing', function(e) {
        generateScript();
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      });

      function getFancyDropdown(element) {
        var value;
        if ($(element).hasClass("select2-hidden-accessible")) {
          value = $(element).select2('val');
        } else {
          value = $(element).val();
        }
        return value;
      }

      function checkSession(field) {
        var fieldValue = sessionStorage.getItem(field);
        if (fieldValue) {
          return fieldValue;
        }
      }

      function startupCheckSession() {
        sessionData = Object(sessionStorage);
        $.each(sessionData, function(k, v) {
          if (k == 'modules') {
          } else {
            $('#' + k).val(v);
            $('#' + k).trigger('change');
          }
        });
      }

      function saveToSession(fieldId, fieldValue) {
        sessionStorage.setItem(fieldId, fieldValue);
      }

      function getSaveData(node) {
        fieldId = $(node).attr('id');
        fieldValue = getFancyDropdown('#' + fieldId);
        if (fieldValue) {
          saveToSession(fieldId, fieldValue);
        }
      }

      function bindEvents() {
        document.addEventListener('change', function(e) {
          var node = e.target;
          getSaveData(node);
          if (hasClass(node, 'queue_radio')) {
            var selected_value = $(".queue_radio:checked").val();
            populateResourceDropdowns(config);
            saveToSession('queue_radio', selected_value);
            handleGPU(selected_value);
            generateScript();
          } else if (hasClass(node, 'gpu-flag-radio')) {
            var selected_value = $(".gpu-flag-radio:checked").val();
            saveToSession('gpu_radio', selected_value);
            populateResourceDropdowns(config);
            generateScript();
          } else {
            generateScript();
          }
        }, false);
      }      
        $("#modules").on('select2:select', function(e) {
          generateScript();
          getSaveData(e.node);
        });
        $("#modules").on('select2:unselect', function() {
          generateScript();
          getSaveData("#modules");
        });
        $("#commands").on('input', function() {
          generateScript();
          getSaveData("#commands");
        });
        $("#copyBtn").click(function() {
          var textToCopy = $("#slurm");
          var text = textToCopy.val();
          copyTextToClipboard(text);
        });
        $("#resetBtn").click(function() {
          sessionStorage.clear();
          collapseResourceTableSession();
          populateQueueRadio(config);
          populateGpuRadio(config);
          populateModules(config);
          populateResourceDropdowns(config);
          populateTimeDropdowns();
          generateScript();
        });
        var resourceTable1 = document.getElementById('resource-table');
        resourceTable1.addEventListener('hidden.bs.collapse', function(e) {
          sessionStorage.setItem('table-toggle', 'collapsed');
          collapseResourceTableSession();
        });
        resourceTable1.addEventListener('shown.bs.collapse', function() {
          sessionStorage.setItem('table-toggle', '');
          collapseResourceTableSession();
        });
      }
    },
  };
  window.addEventListener("load", SlurmOMatic.init());
}(jQuery, window));
